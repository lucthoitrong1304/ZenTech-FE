import { ErrorHandler, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ErrorStateService } from '../services/error-state.service';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(
    private errorStateService: ErrorStateService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  handleError(error: any): void {
    // Prevent infinite loop if the error page itself throws an error.
    if (this.router.url === '/error') {
      console.error('An error occurred on the error page:', error);
      return;
    }

    let title = 'Lỗi hệ thống';
    let message = 'Đã có lỗi không xác định xảy ra trong quá trình xử lý.';
    let code: string | number | undefined;

    if (error instanceof HttpErrorResponse) {
      // Http errors are mostly handled by the Interceptor, 
      // but if they slip through, we handle them here as a fallback.
      title = 'Lỗi kết nối';
      message = error.message;
      code = error.status;
    } else if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }

    // Set state
    this.errorStateService.setError({
      title,
      message,
      code
    });

    // Output to console for debugging purposes
    console.error('GlobalErrorHandler caught an error:', error);

    // Navigate to the error page inside NgZone to ensure Angular picks up the change
    this.ngZone.run(() => {
      this.router.navigate(['/error']);
    });
  }
}
