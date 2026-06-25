import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AdminLogsService } from '../../site-management/admin/data-access/services/admin-logs.service';
import { ClientLogContext, ClientLogEventType, ClientLogLevel, ClientLogPayload } from './client-log.model';
import { sanitizeRecord, sanitizeText, sanitizeUrl } from './client-log-sanitizer';
import { AuthStorageService } from '../services/auth-storage.service';

@Injectable({ providedIn: 'root' })
export class ClientLogService {
  private readonly adminLogsService = inject(AdminLogsService);
  private readonly router = inject(Router);
  private readonly authStorage = inject(AuthStorageService);
  private readonly recentLogKeys = new Map<string, number>();
  private readonly duplicateWindowMs = 3000;

  info(eventType: ClientLogEventType, message: string, context: Partial<ClientLogContext> = {}): void {
    this.write(ClientLogLevel.INFO, eventType, message, context);
  }

  warn(eventType: ClientLogEventType, message: string, context: Partial<ClientLogContext> = {}): void {
    this.write(ClientLogLevel.WARN, eventType, message, context);
  }

  error(eventType: ClientLogEventType, message: string, context: Partial<ClientLogContext> = {}): void {
    this.write(ClientLogLevel.ERROR, eventType, message, context);
  }

  private write(
    level: ClientLogLevel,
    eventType: ClientLogEventType,
    message: string,
    context: Partial<ClientLogContext>
  ): void {
    const routeUrl = context.routeUrl ?? this.router.url;

    if (routeUrl.includes('/logs/client')) {
      return;
    }

    const traceId = context.traceId ?? this.generateTraceId();
    const session = this.authStorage.getSession();
    const sanitizedContext = sanitizeRecord({
      eventType,
      routeUrl: sanitizeUrl(routeUrl),
      traceId,
      method: context.method,
      apiPath: context.apiPath ? sanitizeUrl(context.apiPath) : undefined,
      statusCode: context.statusCode,
      durationMs: context.durationMs,
      userId: context.userId ?? session?.accountId,
      userEmail: context.userEmail ?? session?.email,
      userRole: context.userRole ?? session?.roles?.[0],
      productId: context.productId,
      orderId: context.orderId,
      quantity: context.quantity,
      result: context.result,
      reason: context.reason,
    });
    const sanitizedMessage = sanitizeText(message);
    const duplicateKey = `${level}|${eventType}|${sanitizedMessage}|${routeUrl}`;

    if (this.isDuplicate(duplicateKey)) {
      return;
    }

    const payload: ClientLogPayload = {
      traceId,
      level,
      message: `[${eventType}] ${sanitizedMessage}`,
      url: sanitizeUrl(routeUrl),
      stackTrace: JSON.stringify(sanitizedContext),
    };

    this.adminLogsService.writeClientLog(payload).subscribe({
      error: (error: unknown) => {
        console.error('Gửi client log thất bại:', error);
      },
    });
  }

  private isDuplicate(key: string): boolean {
    const now = Date.now();
    const lastLoggedAt = this.recentLogKeys.get(key);

    this.recentLogKeys.forEach((loggedAt, loggedKey) => {
      if (now - loggedAt > this.duplicateWindowMs) {
        this.recentLogKeys.delete(loggedKey);
      }
    });

    if (lastLoggedAt && now - lastLoggedAt < this.duplicateWindowMs) {
      return true;
    }

    this.recentLogKeys.set(key, now);
    return false;
  }

  private generateTraceId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < 8; i += 1) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `ZT-FE-${result}`;
  }
}
