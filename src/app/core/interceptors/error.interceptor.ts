import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { ErrorStateService } from '../errors/error-state.service';
import { SKIP_GLOBAL_ERROR } from '../tokens/api-context.token';
import { AuthStorageService } from '../services/auth-storage.service';

// State để quản lý việc gọi API refresh token
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const errorStateService = inject(ErrorStateService);
  const authStorageService = inject(AuthStorageService);
  const skipGlobalError = req.context.get(SKIP_GLOBAL_ERROR);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Bỏ qua nếu có cờ SKIP_GLOBAL_ERROR
      if (skipGlobalError) {
        return throwError(() => error);
      }

      // Xử lý riêng cho 401 Unauthorized (Hết hạn Token)
      if (error.status === 401) {
        return handle401Error(req, next, authStorageService, router);
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

// Hàm phụ trợ xử lý luồng 401
function handle401Error(
  req: HttpRequest<any>,
  next: HttpHandlerFn,
  authStorageService: AuthStorageService,
  router: Router
) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const refreshToken = authStorageService.getRefreshToken();

    if (refreshToken) {
      // TODO: Thay đoạn này bằng API call thực tế của bạn (VD: authService.refreshToken())
      // Giả lập gọi API lấy token mới bằng fetch hoặc HttpClient mới để không dính interceptor vòng lặp

      /* MẪU LOGIC GỌI API REFRESH:
      return authService.callRefreshToken(refreshToken).pipe(
        switchMap((res: any) => {
          isRefreshing = false;
          authStorageService.setAccessToken(res.accessToken);
          authStorageService.setRefreshToken(res.refreshToken);
          refreshTokenSubject.next(res.accessToken);

          return next(req.clone({
            setHeaders: { Authorization: `Bearer ${res.accessToken}` }
          }));
        }),
        catchError((err) => {
          isRefreshing = false;
          authStorageService.clear();
          router.navigate(['/auth/login']);
          return throwError(() => err);
        })
      );
      */

      // Tạm thời throw lỗi để bạn lắp API vào sau
      console.warn('Cần implement API gọi Refresh Token ở đây');
      return throwError(() => new Error('Chưa implement Refresh Token API'));

    } else {
      // Không có refresh token -> Bắt đăng nhập lại
      authStorageService.clear();
      router.navigate(['/auth/login']);
      return throwError(() => new Error('Vui lòng đăng nhập lại'));
    }
  } else {
    // Nếu ĐANG trong quá trình refresh token, các request khác sẽ rơi vào trạng thái chờ (queue)
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        return next(req.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        }));
      })
    );
  }
}
