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

  remove(): void {
    this.messageService.clear();
  }

  clear(): void {
    this.messageService.clear();
  }
}

function toPrimeSeverity(type: ToastType): 'success' | 'error' | 'warn' {
  const severityMap: Record<ToastType, 'success' | 'error' | 'warn'> = {
    [ToastType.Success]: 'success',
    [ToastType.Error]: 'error',
    [ToastType.Warning]: 'warn',
  };

  return severityMap[type];
}

function toPrimeSummary(type: ToastType): string {
  const summaryMap: Record<ToastType, string> = {
    [ToastType.Success]: 'Thanh cong',
    [ToastType.Error]: 'Loi',
    [ToastType.Warning]: 'Can luu y',
  };

  return summaryMap[type];
}
