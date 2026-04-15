import { Injectable, signal, computed } from '@angular/core';

export interface ErrorState {
  title: string;
  message: string;
  code?: string | number;
}

@Injectable({
  providedIn: 'root',
})
export class ErrorStateService {
  // 1. Khởi tạo Signal để lưu trữ state lỗi (private để bảo mật dữ liệu)
  private errorState = signal<ErrorState | null>(null);

  // 2. Expose dưới dạng Readonly Signal
  // Các component/service khác chỉ có thể "nghe" chứ không thể dùng hàm .set() trực tiếp
  public readonly error = this.errorState.asReadonly();

  // 3. Tạo một Computed Signal để kiểm tra nhanh xem hiện có lỗi hay không
  public readonly hasError = computed(() => this.errorState() !== null);

  setError(error: ErrorState): void {
    // Cập nhật giá trị mới cho signal
    this.errorState.set(error);
  }

  clearError(): void {
    // Xóa trạng thái lỗi
    this.errorState.set(null);
  }

  // Getter này vẫn có thể giữ lại nếu bạn cần lấy giá trị nhanh trong code logic xử lý
  getError(): ErrorState | null {
    return this.errorState();
  }
}
