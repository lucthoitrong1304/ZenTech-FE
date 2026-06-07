import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, Injector, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ErrorStateService } from './error-state.service';
import { ClientLogService } from '../logging/client-log.service';
import { ClientLogEventType } from '../logging/client-log.model';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(
    private readonly errorStateService: ErrorStateService,
    private readonly router: Router,
    private readonly ngZone: NgZone,
    private readonly injector: Injector
  ) {}

  handleError(error: unknown): void {
    // 1. Unwrap error (Angular đôi khi bọc lỗi trong Promise rejection hoặc thuộc tính error)
    const unwrappedError = this.unwrapError(error);

    // 2. Bỏ qua hoàn toàn các lỗi HTTP vì error.interceptor đã lo nhiệm vụ này rồi
    if (unwrappedError instanceof HttpErrorResponse || error instanceof HttpErrorResponse) {
      return;
    }

    // 3. Chặn vòng lặp vô tận (Infinite loop) nếu lỗi xảy ra ngay trên chính trang /error
    if (this.router.url === '/error') {
      console.error('Lỗi nghiêm trọng (Runtime) xảy ra ngay trên trang Error:', error);
      return;
    }

    console.error('GlobalErrorHandler bắt được lỗi Client-side:', unwrappedError);

    // 4. Xử lý các lỗi Runtime/Logic của Javascript (TypeError, ReferenceError, v.v.)
    let title = 'Lỗi ứng dụng';
    let message = 'Đã có lỗi xảy ra trên trình duyệt của bạn trong quá trình xử lý.';

    if (unwrappedError instanceof Error) {
      message = unwrappedError.message;
    } else if (typeof unwrappedError === 'string') {
      message = unwrappedError;
    }

    // 5. Gửi log lỗi về Backend ghi nhận vào frontend.log
    try {
      const clientLogService = this.injector.get(ClientLogService);

      clientLogService.error(
        ClientLogEventType.RuntimeError,
        message,
        {
          routeUrl: this.router.url,
          reason: unwrappedError instanceof Error ? unwrappedError.name : 'UnknownRuntimeError',
        },
      );
    } catch (loggingError) {
      console.error('Lỗi khi tiêm ClientLogService:', loggingError);
    }

    this.errorStateService.setError({
      title,
      message,
      code: 'CLIENT_ERROR' // Có thể gán 1 mã cố định để dễ phân biệt với mã HTTP (404, 500)
    });

    // 6. Bắt buộc dùng NgZone vì global error có thể văng ra bên ngoài vùng theo dõi của Angular
    this.ngZone.run(() => {
      this.router.navigate(['/error']);
    });
  }

  private unwrapError(error: unknown): unknown {
    if (typeof error !== 'object' || error === null) {
      return error;
    }

    if ('rejection' in error) {
      return error.rejection;
    }

    if ('error' in error) {
      return error.error;
    }

    return error;
  }
}
