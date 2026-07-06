import { HttpInterceptorFn } from '@angular/common/http';
import { generateTraceId } from '../tracing/trace-id.util';

export const traceInterceptor: HttpInterceptorFn = (req, next) => {
  // Attach Trace ID to project backend API calls.
  const isMyApi = req.url.startsWith('/api') || req.url.includes('localhost');

  if (!isMyApi) {
    return next(req);
  }

  const existingTraceId = req.headers.get('X-Trace-Id')?.trim();
  const traceId = existingTraceId || generateTraceId();

  const traceReq = req.clone({
    setHeaders: {
      'X-Trace-Id': traceId,
    },
  });

  return next(traceReq);
};
