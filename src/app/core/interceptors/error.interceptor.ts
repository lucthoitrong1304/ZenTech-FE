import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { ErrorStateService } from '../errors/error-state.service';
import { AuthRefreshService } from '../services/auth-refresh.service';
import { AuthStorageService } from '../services/auth-storage.service';
import { SKIP_AUTH_TOKEN, SKIP_CLIENT_LOG, SKIP_GLOBAL_ERROR } from '../tokens/api-context.token';
import { AuthSessionStore } from '../../site-management/auth/data-access/store/auth-session.store';
import { ClientLogEventType } from '../logging/client-log.model';
import { ClientLogService } from '../logging/client-log.service';

type RefreshState =
  | { status: 'idle' }
  | { status: 'refreshing' }
  | { status: 'success'; accessToken: string }
  | { status: 'failure'; error: unknown };

// State để quản lý việc gọi API refresh token
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<RefreshState>({ status: 'idle' });

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const errorStateService = inject(ErrorStateService);
  const authRefreshService = inject(AuthRefreshService);
  const authStorageService = inject(AuthStorageService);
  const injector = inject(Injector);
  const skipAuth = req.context.get(SKIP_AUTH_TOKEN);
  const skipGlobalError = req.context.get(SKIP_GLOBAL_ERROR);
  const clientLogService = inject(ClientLogService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      logHttpFailure(clientLogService, req, error);

      // Bỏ qua nếu có cờ SKIP_GLOBAL_ERROR
      if (skipGlobalError) {
        return throwError(() => error);
      }

      // Xử lý riêng cho 401 Unauthorized (Hết hạn Token)
      if (error.status === 401) {
        if (skipAuth) {
          return throwError(() => error);
        }

        clientLogService.warn(
          ClientLogEventType.AuthTokenExpired,
          'Phiên đăng nhập hết hạn hoặc không hợp lệ.',
          {
            method: req.method,
            apiPath: req.url,
            statusCode: error.status,
            traceId: req.headers.get('X-Trace-Id') ?? undefined,
          },
        );

        return handle401Error(req, next, authRefreshService, authStorageService, router, injector);
      }
      let shouldRedirect = false;
      let title = 'Lỗi máy chủ';
      let message = 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
      const code = error.status;

      if (error.status === 0) {
        shouldRedirect = true;
        title = 'Mất kết nối';
        message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng của bạn.';
      } else if ([500, 502, 503, 504].includes(error.status)) {
        shouldRedirect = true;
        message =
          'Hệ thống đang gặp gián đoạn (Server Error). Kỹ thuật viên đang xử lý, vui lòng quay lại sau.';
      }

      if (shouldRedirect) {
        errorStateService.setError({ title, message, code });
        if (router.url !== '/error') {
          router.navigate(['/error']);
        }
      }

      return throwError(() => error);
    }),
  );
};

function logHttpFailure(
  clientLogService: ClientLogService,
  req: HttpRequest<unknown>,
  error: HttpErrorResponse,
): void {
  if (req.context.get(SKIP_CLIENT_LOG) || req.url.includes('/logs/client')) {
    return;
  }

  const status = error.status;

  // 1. statusCode từ 200 đến 299 => Bỏ qua hoàn toàn (không ghi ERROR / HttpRequestFailed)
  if (status >= 200 && status < 300) {
    return;
  }

  const traceId = req.headers.get('X-Trace-Id') ?? undefined;
  const reason = getHttpErrorReason(error);

  if (status === 401) {
    return;
  }

  // 2. Request bị network error, timeout, CORS, server không phản hồi => ERROR với statusCode = 0
  if (status === 0 || status === null || status === undefined) {
    clientLogService.error(
      ClientLogEventType.HttpRequestFailed,
      `${req.method} ${req.url} thất bại do lỗi kết nối mạng (Network Error / Timeout / CORS / Server Unreachable).`,
      {
        method: req.method,
        apiPath: req.url,
        statusCode: 0,
        traceId,
        reason: reason || 'Network Error or Server Unreachable',
      },
    );
    return;
  }

  // 3. statusCode từ 400 đến 499 => WARN hoặc ERROR tùy trường hợp
  if (status >= 400 && status < 500) {
    const isWarningStatus = [400, 401, 403, 404, 409].includes(status);
    const message = `${req.method} ${req.url} thất bại với mã ${status}.`;
    const context = {
      method: req.method,
      apiPath: req.url,
      statusCode: status,
      traceId,
      reason,
    };

    if (isWarningStatus) {
      clientLogService.warn(ClientLogEventType.HttpRequestFailed, message, context);
    } else {
      clientLogService.error(ClientLogEventType.HttpRequestFailed, message, context);
    }
    return;
  }

  // 4. statusCode từ 500 trở lên => ERROR
  if (status >= 500) {
    clientLogService.error(
      ClientLogEventType.HttpRequestFailed,
      `${req.method} ${req.url} thất bại với mã ${status}.`,
      {
        method: req.method,
        apiPath: req.url,
        statusCode: status,
        traceId,
        reason,
      },
    );
    return;
  }
}

function getHttpErrorReason(error: HttpErrorResponse): string {
  const responseError = error.error;
  const candidates = [
    typeof responseError === 'object' && responseError !== null ? responseError.message : undefined,
    typeof responseError === 'object' && responseError !== null ? responseError.error : undefined,
    typeof responseError === 'string' ? responseError : undefined,
    getMeaningfulHttpErrorMessage(error),
    error.statusText && error.statusText !== 'OK' ? error.statusText : undefined,
    getFallbackReason(error.status),
  ];

  return candidates.find((candidate): candidate is string => !!candidate && candidate.trim().length > 0) ?? 'Unknown HTTP error';
}

function getMeaningfulHttpErrorMessage(error: HttpErrorResponse): string | undefined {
  if (!error.message || error.statusText === 'OK') {
    return undefined;
  }

  return error.message;
}
function getFallbackReason(status: number): string | undefined {
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 429:
      return 'Too Many Requests';
    default:
      return undefined;
  }
}
function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authRefreshService: AuthRefreshService,
  authStorageService: AuthStorageService,
  router: Router,
  injector: Injector,
) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next({ status: 'refreshing' });

    const refreshToken = authStorageService.getRefreshToken();

    if (refreshToken) {
      return authRefreshService.refresh(refreshToken).pipe(
        switchMap((response) => {
          isRefreshing = false;
          authStorageService.setSession(response);
          refreshTokenSubject.next({ status: 'success', accessToken: response.accessToken });

          return next(addAuthorizationHeader(req, response.accessToken));
        }),
        catchError((error) => {
          isRefreshing = false;
          expireSession(injector, authStorageService);
          refreshTokenSubject.next({ status: 'failure', error });
          navigateToLogin(router);
          return throwError(() => error);
        }),
      );
    } else {
      // Không có refresh token -> Bắt đăng nhập lại
      isRefreshing = false;
      const error = new Error('Vui lòng đăng nhập lại');
      expireSession(injector, authStorageService);
      refreshTokenSubject.next({ status: 'failure', error });
      navigateToLogin(router);
      return throwError(() => error);
    }
  } else {
    // Nếu ĐANG trong quá trình refresh token, các request khác sẽ rơi vào trạng thái chờ (queue)
    return refreshTokenSubject.pipe(
      filter((state) => state.status === 'success' || state.status === 'failure'),
      take(1),
      switchMap((state) => {
        if (state.status === 'failure') {
          return throwError(() => state.error);
        }

        return next(addAuthorizationHeader(req, state.accessToken));
      }),
    );
  }
}

function expireSession(injector: Injector, authStorageService: AuthStorageService): void {
  try {
    injector.get(AuthSessionStore).expireSession();
  } catch {
    authStorageService.clear();
  }
}

function navigateToLogin(router: Router): void {
  if (!router.url.startsWith('/auth/login')) {
    router.navigate(['/auth/login'], { replaceUrl: true });
  }
}

function addAuthorizationHeader(
  req: HttpRequest<unknown>,
  accessToken: string,
): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
