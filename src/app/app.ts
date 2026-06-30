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

  private readonly categoryNavigationStore = inject(CategoryNavigationStore);
  private readonly router = inject(Router);
  private readonly authStorageService = inject(AuthStorageService);
  private readonly routeClientLogService = inject(RouteClientLogService);
  private readonly adminLogsService = inject(AdminLogsService);
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

      let events: any[] = [];
      win.rrweb.record({
        emit: (event: any) => {
          events.push(event);
        },
        maskAllInputs: false,
        maskInputOptions: {
          password: true
        },
        blockClass: 'rr-block',
        ignoreClass: 'rr-ignore'
      });

      setInterval(() => {
        const isAuthenticated = this.authStorageService.isAuthenticated();
        const email = this.authStorageService.getSession()?.email;
        if (isAuthenticated && email && events.length > 0) {
          const batch = [...events];
          events = [];
          this.uploadRecording(email, batch);
        } else if (!isAuthenticated || !email) {
          if (events.length > 5000) {
            events = events.slice(-1000);
          }
        }
      }, 10000);

      win.addEventListener('beforeunload', () => {
        const isAuthenticated = this.authStorageService.isAuthenticated();
        const email = this.authStorageService.getSession()?.email;
        if (isAuthenticated && email && events.length > 0) {
          const batch = [...events];
          events = [];
          this.uploadRecordingBeacon(email, batch);
        }
      });
    }).catch((err: any) => {
      console.error('Failed to load rrweb screen recorder:', err);
    });
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
    this.adminLogsService.uploadRecording(email, sessionId, events).subscribe({
      error: (err) => console.error('Failed to upload screen recording chunk:', err)
    });
  }

  private uploadRecordingBeacon(email: string, events: any[]): void {
    const token = this.authStorageService.getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const sessionId = this.getRecordingSessionId(email, events);
    const url = `${environment.apiBaseUrl}/admin/activity-logs/recordings?email=${encodeURIComponent(email)}&sessionId=${encodeURIComponent(sessionId)}`;
    fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(events),
      keepalive: true
    }).catch(err => console.error('Beacon upload failed:', err));
  }
}
