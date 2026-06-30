import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { filter, map } from 'rxjs';
import { ToastComponent } from './shared/components/toast/toast.component';
import { CustomerChatPopupComponent } from './site-management/customer-chat/components/customer-chat-popup/customer-chat-popup.component';
import { CategoryNavigationStore } from './site-management/shared/data-access/store/category-navigation.store';
import { AuthStorageService } from './core/services/auth-storage.service';
import { RouteClientLogService } from './core/logging/route-client-log.service';
import { Role } from './site-management/auth/data-access/models/auth.enums';
import { hasRole } from './site-management/auth/data-access/utils/auth-role.utils';
import { AdminLogsService } from './site-management/admin/data-access/services/admin-logs.service';
import { environment } from '../environments/environment';

interface RecordingUploadBatch {
  email: string;
  sessionId: string;
  events: any[];
  attempts: number;
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ConfirmDialogModule, ToastComponent, CustomerChatPopupComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private static readonly RECORDING_SESSION_MAX_AGE_MS = 30 * 60 * 1000;
  private static readonly RECORDING_IDLE_BREAK_MS = 10 * 60 * 1000;
  private static readonly RECORDING_FLUSH_INTERVAL_MS = 10_000;
  private static readonly RECORDING_MAX_EVENTS_PER_BATCH = 1_500;
  private static readonly RECORDING_MAX_PENDING_BATCHES = 12;
  private static readonly RECORDING_MAX_RETRY_ATTEMPTS = 3;
  private static readonly RECORDING_RETRY_DELAY_MS = 5_000;
  private static readonly RECORDING_MAX_ANONYMOUS_EVENTS = 1_000;
  private static readonly RECORDING_EXCLUDED_ROUTE_PREFIXES = [
    '/admin/logs',
    '/admin/activity-logs',
    '/admin/resource-monitoring'
  ];

  private readonly categoryNavigationStore = inject(CategoryNavigationStore);
  private readonly router = inject(Router);
  private readonly authStorageService = inject(AuthStorageService);
  private readonly routeClientLogService = inject(RouteClientLogService);
  private readonly adminLogsService = inject(AdminLogsService);
  private readonly recordingUploadQueue: RecordingUploadBatch[] = [];
  private recordingEvents: any[] = [];
  private stopScreenRecording: (() => void) | null = null;
  private recordingUploadInFlight = false;
  private recordingRetryTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly title = signal('ZenTech-FE');
  protected readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );
  protected readonly showCustomerChat = computed(() => {
    const url = this.currentUrl();
    const session = this.authStorageService.getSession();
    const roles = session?.roles ?? [];
    const isStaff =
      hasRole(roles, Role.OWNER) ||
      hasRole(roles, Role.MANAGER) ||
      hasRole(roles, Role.EMPLOYEE) ||
      hasRole(roles, Role.ADMIN);

    if (isStaff) {
      return false;
    }

    return !(
      url === '/chat' ||
      url.startsWith('/management') ||
      url.startsWith('/admin') ||
      url.startsWith('/auth') ||
      url.startsWith('/reset-password') ||
      url.startsWith('/error')
    );
  });

  constructor() {
    this.categoryNavigationStore.loadCategoriesOnce();
    this.routeClientLogService.initialize();
    this.initScreenRecording();
  }

  private initScreenRecording(): void {
    const rrwebUrl = '/rrweb/zt-player-core.js';
    this.loadScript(rrwebUrl).then(() => {
      const win = window as any;
      if (!win.rrweb) {
        console.error('rrweb not loaded');
        return;
      }

      const startRecording = () => {
        if (this.stopScreenRecording || this.shouldSkipScreenRecording(this.router.url)) {
          this.recordingEvents = [];
          return;
        }

        this.stopScreenRecording = win.rrweb.record({
          emit: (event: any) => {
            if (!this.shouldSkipScreenRecording(this.router.url)) {
              this.recordingEvents.push(event);
            }
          },
          maskAllInputs: true,
          maskInputOptions: {
            password: true,
            email: true,
            tel: true,
            text: true,
            textarea: true,
            number: true,
            search: true
          },
          blockClass: 'rr-block',
          ignoreClass: 'rr-ignore',
          sampling: {
            mousemove: 50,
            scroll: 150,
            input: 'last'
          }
        });
      };

      const stopRecording = () => {
        if (this.stopScreenRecording) {
          this.stopScreenRecording();
          this.stopScreenRecording = null;
        }
        this.recordingEvents = [];
      };

      startRecording();
      this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => {
        if (this.shouldSkipScreenRecording(this.router.url)) {
          stopRecording();
        } else if (!this.stopScreenRecording) {
          startRecording();
        }
      });

      setInterval(() => {
        if (this.shouldSkipScreenRecording(this.router.url)) {
          stopRecording();
          this.flushRecordingQueue();
          return;
        }

        const isAuthenticated = this.authStorageService.isAuthenticated();
        const email = this.authStorageService.getSession()?.email;
        if (isAuthenticated && email && this.recordingEvents.length > 0) {
          const batch = [...this.recordingEvents];
          this.recordingEvents = [];
          this.uploadRecording(email, batch);
        } else if (!isAuthenticated || !email) {
          if (this.recordingEvents.length > App.RECORDING_MAX_ANONYMOUS_EVENTS) {
            this.recordingEvents = this.recordingEvents.slice(-App.RECORDING_MAX_ANONYMOUS_EVENTS);
          }
        }
        this.flushRecordingQueue();
      }, App.RECORDING_FLUSH_INTERVAL_MS);

      win.addEventListener('beforeunload', () => {
        if (this.shouldSkipScreenRecording(this.router.url)) {
          return;
        }

        const isAuthenticated = this.authStorageService.isAuthenticated();
        const email = this.authStorageService.getSession()?.email;
        if (isAuthenticated && email && this.recordingEvents.length > 0) {
          const batch = [...this.recordingEvents];
          this.recordingEvents = [];
          this.uploadRecordingBeacon(email, batch);
        }

        for (const queuedBatch of this.recordingUploadQueue.slice(0, 3)) {
          this.uploadRecordingBeacon(queuedBatch.email, queuedBatch.events, queuedBatch.sessionId);
        }
      });
    }).catch((err: any) => {
      console.error('Failed to load rrweb screen recorder:', err);
    });
  }

  private shouldSkipScreenRecording(url: string): boolean {
    const path = (url || '').split('?')[0].split('#')[0];
    return App.RECORDING_EXCLUDED_ROUTE_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix + '/'));
  }

  private loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = url;
      script.type = 'text/javascript';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  }

  private getRecordingSessionId(email: string, events: any[] = []): string {
    const now = Date.now();
    const eventTime = this.getLatestRecordingEventTime(events) ?? now;
    const storedEmail = sessionStorage.getItem('recordingSessionEmail');
    const sessionCreatedAt = Number(sessionStorage.getItem('recordingSessionCreatedAt') || '0');
    const sessionLastActiveAt = Number(sessionStorage.getItem('recordingSessionLastActiveAt') || '0');
    let sessionId = sessionStorage.getItem('recordingSessionId') || '';

    const shouldRotateSession =
      !sessionId ||
      storedEmail !== email ||
      sessionCreatedAt <= 0 ||
      eventTime - sessionCreatedAt >= App.RECORDING_SESSION_MAX_AGE_MS ||
      (sessionLastActiveAt > 0 && eventTime - sessionLastActiveAt >= App.RECORDING_IDLE_BREAK_MS);

    if (shouldRotateSession) {
      sessionId = this.createRecordingSessionId(eventTime);
      sessionStorage.setItem('recordingSessionId', sessionId);
      sessionStorage.setItem('recordingSessionEmail', email);
      sessionStorage.setItem('recordingSessionCreatedAt', String(eventTime));
    }

    sessionStorage.setItem('recordingSessionLastActiveAt', String(eventTime));
    return sessionId;
  }

  private createRecordingSessionId(timestamp: number): string {
    const uuid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    return `${timestamp}_${uuid}`;
  }

  private getLatestRecordingEventTime(events: any[]): number | null {
    for (let index = events.length - 1; index >= 0; index--) {
      const timestamp = Number(events[index]?.timestamp);
      if (Number.isFinite(timestamp) && timestamp > 0) {
        return timestamp;
      }
    }
    return null;
  }

  private uploadRecording(email: string, events: any[]): void {
    const sessionId = this.getRecordingSessionId(email, events);
    this.enqueueRecordingUpload(email, sessionId, events);
  }

  private enqueueRecordingUpload(email: string, sessionId: string, events: any[]): void {
    for (let index = 0; index < events.length; index += App.RECORDING_MAX_EVENTS_PER_BATCH) {
      this.recordingUploadQueue.push({
        email,
        sessionId,
        events: events.slice(index, index + App.RECORDING_MAX_EVENTS_PER_BATCH),
        attempts: 0
      });
    }

    while (this.recordingUploadQueue.length > App.RECORDING_MAX_PENDING_BATCHES) {
      const dropped = this.recordingUploadQueue.shift();
      console.warn('Dropped old screen recording batch after queue limit was reached:', dropped?.events.length ?? 0);
    }

    this.flushRecordingQueue();
  }

  private flushRecordingQueue(): void {
    if (this.recordingUploadInFlight || this.recordingUploadQueue.length === 0) {
      return;
    }

    if (!this.authStorageService.isAuthenticated()) {
      return;
    }

    const batch = this.recordingUploadQueue[0];
    this.recordingUploadInFlight = true;
    this.adminLogsService.uploadRecording(batch.email, batch.sessionId, batch.events).subscribe({
      next: () => {
        this.recordingUploadQueue.shift();
        this.recordingUploadInFlight = false;
        this.flushRecordingQueue();
      },
      error: (err) => {
        batch.attempts += 1;
        this.recordingUploadInFlight = false;
        if (batch.attempts >= App.RECORDING_MAX_RETRY_ATTEMPTS) {
          this.recordingUploadQueue.shift();
          console.error('Dropped screen recording batch after retry limit:', err);
          this.flushRecordingQueue();
          return;
        }

        if (this.recordingRetryTimer) {
          clearTimeout(this.recordingRetryTimer);
        }
        this.recordingRetryTimer = setTimeout(() => {
          this.recordingRetryTimer = null;
          this.flushRecordingQueue();
        }, App.RECORDING_RETRY_DELAY_MS);
      }
    });
  }

  private uploadRecordingBeacon(email: string, events: any[], existingSessionId?: string): void {
    const token = this.authStorageService.getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const sessionId = existingSessionId || this.getRecordingSessionId(email, events);
    const url = `${environment.apiBaseUrl}/admin/activity-logs/recordings?email=${encodeURIComponent(email)}&sessionId=${encodeURIComponent(sessionId)}`;
    for (let index = 0; index < events.length; index += App.RECORDING_MAX_EVENTS_PER_BATCH) {
      const chunk = events.slice(index, index + App.RECORDING_MAX_EVENTS_PER_BATCH);
      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(chunk),
        keepalive: true
      }).catch(err => console.error('Beacon upload failed:', err));
    }
  }
}
