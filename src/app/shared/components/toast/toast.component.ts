import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';
import { Toast, ToastType } from '../../models/toast.model';

@Component({
  selector: 'app-toast',
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css'
})
export class ToastComponent implements OnInit {
  protected toasts = signal<Toast[]>([]);

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService.success('Profile updated successfully');
    this.toastService.error('This action cannot be undone');
    this.toastService.warning('Failed to connect to server');  

    this.toastService.toasts$.subscribe(toasts => {
      this.toasts.set(toasts);
    });
  }

  protected close(id: string): void {
    this.toastService.remove(id);
  }

  // Lấy toàn class Icon Toast
  protected getIconPath(type: ToastType): string {
    const iconMap: Record<ToastType, string> = {
      [ToastType.Success]: 'icons/success.svg',
      [ToastType.Error]: 'icons/error.svg',
      [ToastType.Warning]: 'icons/warning.svg'
    };
    return iconMap[type];
  }

  // Lấy toàn class Toast => Apply style phù hợp cho từng loại Toast
  protected getToastClass(type: ToastType): string {
    const classMap: Record<ToastType, string> = {
      [ToastType.Success]: 'success',
      [ToastType.Error]: 'error',
      [ToastType.Warning]: 'warning'
    };
    return classMap[type];
  }
}
