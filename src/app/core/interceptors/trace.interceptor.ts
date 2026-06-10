import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Sinh ngẫu nhiên mã Trace ID có định dạng ZT-xxxxxxx
 */
function generateTraceId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'ZT-' + result;
}

export const traceInterceptor: HttpInterceptorFn = (req, next) => {
  // Chỉ gán Trace ID cho các API gọi tới backend của dự án
  const isMyApi = req.url.startsWith('/api') || req.url.includes('localhost');

  if (!isMyApi) {
    return next(req);
  }

  const traceId = generateTraceId();

  // Clone request và đính kèm header X-Trace-Id
  const traceReq = req.clone({
    setHeaders: {
      'X-Trace-Id': traceId,
    },
  });

  return next(traceReq);
};
