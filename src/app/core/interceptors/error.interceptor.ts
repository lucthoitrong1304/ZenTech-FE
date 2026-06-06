import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { ErrorStateService } from '../errors/error-state.service';
import { AuthRefreshService } from '../services/auth-refresh.service';
import { AuthStorageService } from '../services/auth-storage.service';
import { SKIP_AUTH_TOKEN, SKIP_GLOBAL_ERROR } from '../tokens/api-context.token';
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

        return handle401Error(req, next, authRefreshService, authStorageService, router);
      }

      // Xử lý riêng cho 403 Forbidden (Không có quyền)
      if (error.status === 403) {
        const currentUrl = router.url;
        if (currentUrl.startsWith('/management') || currentUrl.startsWith('/admin')) {
          // Cập nhật lại role của user thành CUSTOMER vì đã bị chặn truy cập quản trị
          try {
            const authSessionStore = injector.get(AuthSessionStore);
            authSessionStore.updateUserRoles(['ROLE_CUSTOMER']);
          } catch (e) {
            console.error('Không thể cập nhật vai trò người dùng trong interceptor:', e);
          }
          // Chuyển hướng người dùng về trang chủ
          router.navigate(['/']);
        }
      }

      // Xử lý các lỗi hệ thống/mạng khác
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
        message = 'Hệ thống đang gặp gián đoạn (Server Error). Kỹ thuật viên đang xử lý, vui lòng quay lại sau.';
      }

      if (shouldRedirect) {
        errorStateService.setError({ title, message, code });
        if (router.url !== '/error') {
          router.navigate(['/error']);
        }
      }

      return throwError(() => error);
    })
  );
};

function logHttpFailure(
  clientLogService: ClientLogService,
  req: HttpRequest<unknown>,
  error: HttpErrorResponse
): void {
  if (req.url.includes('/logs/client')) {
    return;
  }

  clientLogService.error(
    ClientLogEventType.HttpRequestFailed,
    `${req.method} ${req.url} thất bại với mã ${error.status}.`,
    {
      method: req.method,
      apiPath: req.url,
      statusCode: error.status,
      traceId: req.headers.get('X-Trace-Id') ?? undefined,
      reason: error.statusText || error.message,
    },
  );
}

// Hàm phụ trợ xử lý luồng 401
function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authRefreshService: AuthRefreshService,
  authStorageService: AuthStorageService,
  router: Router
) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next({ status: 'refreshing' });

    const refreshToken = authStorageService.getRefreshToken();

    if (refreshToken) {
      return authRefreshService.refresh(refreshToken).pipe(
        switchMap(response => {
          isRefreshing = false;
          authStorageService.setSession(response);
          refreshTokenSubject.next({ status: 'success', accessToken: response.accessToken });

          return next(addAuthorizationHeader(req, response.accessToken));
        }),
        catchError(error => {
          isRefreshing = false;
          authStorageService.clear();
          refreshTokenSubject.next({ status: 'failure', error });
          router.navigate(['/auth/login']);
          return throwError(() => error);
        })
      );
    } else {
      // Không có refresh token -> Bắt đăng nhập lại
      isRefreshing = false;
      const error = new Error('Vui lòng đăng nhập lại');
      authStorageService.clear();
      refreshTokenSubject.next({ status: 'failure', error });
      router.navigate(['/auth/login']);
      return throwError(() => error);
    }
  } else {
    // Nếu ĐANG trong quá trình refresh token, các request khác sẽ rơi vào trạng thái chờ (queue)
    return refreshTokenSubject.pipe(
      filter(state => state.status === 'success' || state.status === 'failure'),
      take(1),
      switchMap(state => {
        if (state.status === 'failure') {
          return throwError(() => state.error);
        }

        return next(addAuthorizationHeader(req, state.accessToken));
      })
    );
  }
}

function addAuthorizationHeader(
  req: HttpRequest<unknown>,
  accessToken: string
): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
