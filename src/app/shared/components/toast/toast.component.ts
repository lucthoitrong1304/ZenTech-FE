import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Toast, ToastType } from './toast.model';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css'
})
export class ToastComponent implements OnInit {
  protected toasts = signal<Toast[]>([]);

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
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
      [ToastType.Success]: 'ic_success',
      [ToastType.Error]: 'ic_error',
      [ToastType.Warning]: 'ic_warning'
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
