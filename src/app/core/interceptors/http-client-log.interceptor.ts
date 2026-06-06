import { HttpEvent, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { ClientLogEventType } from '../logging/client-log.model';
import { ClientLogService } from '../logging/client-log.service';
import { SKIP_CLIENT_LOG } from '../tokens/api-context.token';

const LOGGED_SUCCESS_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const httpClientLogInterceptor: HttpInterceptorFn = (req, next) => {
  const clientLogService = inject(ClientLogService);
  const startedAt = performance.now();
  const traceId = req.headers.get('X-Trace-Id') ?? undefined;

  if (req.context.get(SKIP_CLIENT_LOG) || req.url.includes('/logs/client')) {
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
