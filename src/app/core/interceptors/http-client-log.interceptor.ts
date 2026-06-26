import { HttpEvent, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { ClientLogEventType } from '../logging/client-log.model';
import { ClientLogService } from '../logging/client-log.service';
import { SKIP_CLIENT_LOG } from '../tokens/api-context.token';

const LOGGED_SUCCESS_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const EXCLUDED_SUCCESS_URLS = [
  '/api/notifications',
  '/api/notifications/unread-count',
  '/api/logs/client',
  '/api/admin/logs',
  '/api/admin/activity-logs',
  '/api/admin/incidents/issue-links'
];

export const httpClientLogInterceptor: HttpInterceptorFn = (req, next) => {
  const clientLogService = inject(ClientLogService);
  const startedAt = performance.now();
  const traceId = req.headers.get('X-Trace-Id') ?? undefined;

  const isExcludedUrl = EXCLUDED_SUCCESS_URLS.some(url => req.url.includes(url));

  if (req.context.get(SKIP_CLIENT_LOG) || isExcludedUrl) {
    return next(req);
  }

  return next(req).pipe(
    tap((event: HttpEvent<unknown>) => {
      if (event.type !== HttpEventType.Response || !LOGGED_SUCCESS_METHODS.has(req.method)) {
        return;
      }

      clientLogService.info(
        ClientLogEventType.HttpRequestSucceeded,
        `${req.method} ${req.url} hoàn tất thành công.`,
        {
          method: req.method,
          apiPath: req.url,
          statusCode: event.status,
          durationMs: Math.round(performance.now() - startedAt),
          traceId,
        },
      );
    }),
  );
};
