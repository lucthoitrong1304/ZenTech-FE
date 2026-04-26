import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ToastType } from './toast.model';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly messageService = inject(MessageService);

  show(type: ToastType, message: string, duration: number = 5000): void {
    this.messageService.add({
      severity: toPrimeSeverity(type),
      summary: toPrimeSummary(type),
      detail: message,
      life: duration,
    });
  }

  success(message: string, duration: number = 5000): void {
    this.show(ToastType.Success, message, duration);
  }

  error(message: string, duration: number = 5000): void {
    this.show(ToastType.Error, message, duration);
  }

  warning(message: string, duration: number = 5000): void {
    this.show(ToastType.Warning, message, duration);
  }

  info(message: string, duration: number = 5000): void {
    this.show(ToastType.Info, message, duration);
  }

  remove(): void {
    this.messageService.clear();
  }

  clear(): void {
    this.messageService.clear();
  }
}

function toPrimeSeverity(type: ToastType): 'success' | 'error' | 'warn' | 'info' {
  const severityMap: Record<ToastType, 'success' | 'error' | 'warn' | 'info'> = {
    [ToastType.Success]: 'success',
    [ToastType.Error]: 'error',
    [ToastType.Warning]: 'warn',
    [ToastType.Info]: 'info',
  };

  return severityMap[type];
}

function toPrimeSummary(type: ToastType): string {
  const summaryMap: Record<ToastType, string> = {
    [ToastType.Success]: 'Thành công',
    [ToastType.Error]: 'Lỗi hệ thống',
    [ToastType.Warning]: 'Cảnh báo',
    [ToastType.Info]: 'Thông tin',
  };

  return summaryMap[type];
}
