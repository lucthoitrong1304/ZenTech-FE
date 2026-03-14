import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ErrorStateService } from '../services/error-state.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const errorStateService = inject(ErrorStateService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let shouldRedirect = false;
      let title = 'Lỗi máy chủ';
      let message = 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
      let code = error.status;

      if (error.status === 0) {
        // Mất kết nối mạng hoặc CORS
        shouldRedirect = true;
        title = 'Mất kết nối';
        message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng của bạn.';
      } else if (error.status === 500 || error.status === 503 || error.status === 502 || error.status === 504) {
        // Lỗi từ phía Server
        shouldRedirect = true;
        title = 'Lỗi máy chủ';
        message = 'Hệ thống đang gặp gián đoạn (Server Error). Kỹ thuật viên đang xử lý, vui lòng quay lại sau.';
      }

      if (shouldRedirect) {
        errorStateService.setError({
          title,
          message,
          code
        });
        
        // Không gọi router.navigate nếu đang ở trang error để tránh loop
        if (router.url !== '/error') {
            router.navigate(['/error']);
        }
      }

      // Trả lại error cho các luồng HTTP xử lý tự bắt lỗi 400 Bad Request
      return throwError(() => error);
    })
  );
};
