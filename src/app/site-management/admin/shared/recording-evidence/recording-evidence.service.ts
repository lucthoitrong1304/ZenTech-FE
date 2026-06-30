import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap, throwError } from 'rxjs';
import { AdminLogsService } from '../../data-access/services/admin-logs.service';
import {
  RecordingEvidenceRequest,
  RecordingEvidenceResult,
  RecordingEvidenceSession
} from './recording-evidence.models';

interface CachedSessions {
  expiresAt: number;
  sessions: RecordingEvidenceSession[];
}

@Injectable({ providedIn: 'root' })
export class RecordingEvidenceService {
  private readonly adminLogsService = inject(AdminLogsService);
  private readonly sessionCache = new Map<string, CachedSessions>();
  private readonly sessionCacheTtlMs = 5 * 60 * 1000;

  resolveEvidence(request: RecordingEvidenceRequest): Observable<RecordingEvidenceResult> {
    const email = this.normalizeEmail(request.email);
    const eventTimestampMs = this.toTimestampMs(request.timestamp);

    if (!email) {
      return throwError(() => new Error('MISSING_EMAIL'));
    }
    if (email.includes('*')) {
      return throwError(() => new Error('MASKED_EMAIL'));
    }
    if (!Number.isFinite(eventTimestampMs)) {
      return throwError(() => new Error('INVALID_TIMESTAMP'));
    }

    return this.getRecordingSessions(email).pipe(
      switchMap((sessions) => {
        const session = this.findSessionForTimestamp(sessions, eventTimestampMs);
        if (!session) {
          return throwError(() => new Error('NO_SESSION'));
        }

        const sessionStartMs = Number(session.timestamp);
        const offsetMs = Math.max(0, eventTimestampMs - sessionStartMs);
        const clipStartMs = Math.max(0, offsetMs - Math.max(0, request.clipBeforeMs));
        const clipEndMs = offsetMs + Math.max(0, request.clipAfterMs);

        return this.adminLogsService.getRecording(email, session.sessionId).pipe(
          map((res) => {
            const rawEvents = Array.isArray(res.data) ? res.data : [];
            if (rawEvents.length === 0) {
              throw new Error('NO_EVENTS');
            }

            const events = this.buildRecordingClip(rawEvents, sessionStartMs, clipStartMs, clipEndMs);
            if (events.length === 0) {
              throw new Error('NO_CLIP_EVENTS');
            }

            return {
              email,
              traceId: request.traceId?.trim() || null,
              session,
              events,
              eventTimestampMs,
              sessionStartMs,
              offsetMs,
              clipStartMs,
              clipEndMs
            };
          })
        );
      })
    );
  }

  getRecordingSessions(email: string): Observable<RecordingEvidenceSession[]> {
    const normalizedEmail = this.normalizeEmail(email);
    const cached = this.sessionCache.get(normalizedEmail);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return new Observable<RecordingEvidenceSession[]>((subscriber) => {
        subscriber.next(cached.sessions);
        subscriber.complete();
      });
    }

    return this.adminLogsService.getRecordingSessions(normalizedEmail).pipe(
      map((res) => {
        const sessions = (Array.isArray(res.data) ? res.data : [])
          .map((session: any) => ({
            sessionId: String(session?.sessionId || ''),
            timestamp: Number(session?.timestamp || 0)
          }))
          .filter(session => !!session.sessionId && Number.isFinite(session.timestamp) && session.timestamp > 0)
          .sort((a, b) => a.timestamp - b.timestamp);

        this.sessionCache.set(normalizedEmail, {
          expiresAt: now + this.sessionCacheTtlMs,
          sessions
        });
        return sessions;
      })
    );
  }

  private findSessionForTimestamp(
    sessions: RecordingEvidenceSession[],
    timestampMs: number
  ): RecordingEvidenceSession | null {
    if (sessions.length === 0) return null;

    for (let i = 0; i < sessions.length; i++) {
      const current = sessions[i];
      const next = sessions[i + 1];
      const start = Number(current.timestamp);
      const end = next ? Number(next.timestamp) : Number.POSITIVE_INFINITY;
      if (timestampMs >= start && timestampMs < end) {
        return current;
      }
    }

    return sessions
      .filter(session => session.timestamp <= timestampMs)
      .sort((a, b) => b.timestamp - a.timestamp)[0] || null;
  }

  private buildRecordingClip(
    events: any[],
    sessionStartMs: number,
    clipStartMs: number,
    clipEndMs: number
  ): any[] {
    const clipStartAbs = sessionStartMs + clipStartMs;
    const clipEndAbs = sessionStartMs + clipEndMs;
    const validEvents = events
      .filter(event => Number.isFinite(Number(event?.timestamp)))
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    if (validEvents.length === 0) return [];

    let snapshotIndex = validEvents.findIndex(event => event.type === 2);
    for (let i = 0; i < validEvents.length; i++) {
      const event = validEvents[i] as any;
      const eventTime = Number(event.timestamp);
      if (eventTime <= clipStartAbs && event.type === 2) {
        snapshotIndex = i;
      }
      if (eventTime > clipStartAbs) break;
    }
    if (snapshotIndex < 0) snapshotIndex = 0;

    const snapshotTime = Number(validEvents[snapshotIndex]?.timestamp || sessionStartMs);
    let metaIndex = -1;
    for (let i = snapshotIndex; i >= 0; i--) {
      if ((validEvents[i] as any).type === 4) {
        metaIndex = i;
        break;
      }
    }
    if (metaIndex < 0) {
      metaIndex = validEvents.findIndex(event => event.type === 4);
    }

    const firstClipEventIndex = validEvents.findIndex(event => Number((event as any).timestamp) >= clipStartAbs);
    const preludeEndIndex = firstClipEventIndex >= 0 ? firstClipEventIndex : validEvents.length;
    const preludeEvents = validEvents
      .slice(snapshotIndex, preludeEndIndex)
      .filter(event => !this.isPointerTrailEvent(event));
    const clipEvents = validEvents.filter(event => {
      const eventTime = Number((event as any).timestamp);
      return eventTime >= clipStartAbs && eventTime <= clipEndAbs;
    });

    const sourceEvents: any[] = [];
    if (metaIndex >= 0) {
      sourceEvents.push(validEvents[metaIndex]);
    }
    sourceEvents.push(...preludeEvents, ...clipEvents);
    if (sourceEvents.length === 0) return [];

    const syntheticBase = Number(validEvents[0]?.timestamp || Date.now());
    const preludeWindowMs = 100;
    const preludeSpan = Math.max(1, clipStartAbs - snapshotTime);

    const clippedEvents = sourceEvents.map((event, index) => {
      const cloned = this.cloneRecordingEvent(event);
      const eventTime = Number((event as any).timestamp);
      if (index === 0 && cloned.type === 4) {
        cloned.timestamp = syntheticBase;
      } else if (eventTime < clipStartAbs) {
        const compressedOffset = Math.max(
          1,
          Math.min(preludeWindowMs, Math.round(((eventTime - snapshotTime) / preludeSpan) * preludeWindowMs))
        );
        cloned.timestamp = syntheticBase + compressedOffset;
      } else {
        cloned.timestamp = syntheticBase + preludeWindowMs + Math.max(0, Math.min(eventTime, clipEndAbs) - clipStartAbs);
      }
      return cloned;
    });

    const clipDurationMs = Math.max(1, clipEndAbs - clipStartAbs);
    const desiredEndTimestamp = syntheticBase + preludeWindowMs + clipDurationMs;
    const lastTimestamp = Math.max(...clippedEvents.map(event => Number(event?.timestamp || 0)));
    if (lastTimestamp < desiredEndTimestamp) {
      clippedEvents.push({
        type: 5,
        timestamp: desiredEndTimestamp,
        data: {
          tag: 'recording-evidence:end',
          payload: { durationMs: clipDurationMs }
        }
      });
    }

    return clippedEvents;
  }

  private isPointerTrailEvent(event: any): boolean {
    if (event?.type !== 3) return false;
    const source = Number(event?.data?.source);
    return source === 1 || source === 6 || source === 12;
  }

  private cloneRecordingEvent(event: any): any {
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(event);
      } catch (err) {
        // rrweb payloads are JSON-like; JSON clone is enough as a fallback.
      }
    }
    return JSON.parse(JSON.stringify(event));
  }

  private normalizeEmail(email: string | null | undefined): string {
    return (email || '').trim().toLowerCase();
  }

  private toTimestampMs(value: Date | string | number): number {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    return new Date(value).getTime();
  }
}
