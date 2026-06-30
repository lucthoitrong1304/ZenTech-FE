export interface RecordingEvidenceSession {
  sessionId: string;
  timestamp: number;
}

export interface RecordingEvidenceRequest {
  email: string;
  timestamp: Date | string | number;
  traceId?: string | null;
  clipBeforeMs: number;
  clipAfterMs: number;
}

export interface RecordingEvidenceResult {
  email: string;
  traceId: string | null;
  session: RecordingEvidenceSession;
  events: any[];
  eventTimestampMs: number;
  sessionStartMs: number;
  offsetMs: number;
  clipStartMs: number;
  clipEndMs: number;
}
