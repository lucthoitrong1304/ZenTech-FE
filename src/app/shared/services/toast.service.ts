import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Toast, ToastType } from '../models/toast.model';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  // Kho lưu trữ state
  // Bộ phát sự kiện
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  // Kênh phát sống ra ngoài
  // asObservable() => Che giấu các method next, complete. Chỉ expose method subscribe => Nhận dữ liệu / không chỉnh sửa được dữ liệu.
  public toasts$: Observable<Toast[]> = this.toastsSubject.asObservable();

  // Generate ID 
  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // Define show Toast
  public show(type: ToastType, message: string, duration: number = 5000): void {
    const toast: Toast = {
      id: this.generateId(),
      type,
      message,
      duration
    };

    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(toast.id);
      }, duration);
    }
  }

  public success(message: string, duration: number = 5000): void {
    this.show(ToastType.Success, message, duration);
  }

  public error(message: string, duration: number = 5000): void {
    this.show(ToastType.Error, message, duration);
  }

  public warning(message: string, duration: number = 5000): void {
    this.show(ToastType.Warning, message, duration);
  }

  public remove(id: string): void {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter(toast => toast.id !== id));
  }

  public clear(): void {
    this.toastsSubject.next([]);
  }
}
