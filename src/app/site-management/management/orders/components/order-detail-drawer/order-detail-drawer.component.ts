import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import {
  LucidePrinter,
  LucideX,
  LucideClock,
  LucideClipboardCheck,
  LucideTruck,
  LucideCheckCircle,
  LucideAlertTriangle,
} from '@lucide/angular';
import {
  ManagementOrder,
  ManagementOrderStatus,
  ManagementPaymentStatus,
} from '../../data-access/models/management-order.models';

@Component({
  selector: 'app-order-detail-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    LucidePrinter,
    LucideX,
    LucideClock,
    LucideClipboardCheck,
    LucideTruck,
    LucideCheckCircle,
    LucideAlertTriangle,
  ],
  templateUrl: './order-detail-drawer.component.html',
  styleUrl: './order-detail-drawer.component.css',
})
export class OrderDetailDrawerComponent {
  readonly visible = input.required<boolean>();
  readonly order = input.required<ManagementOrder | null>();

  readonly close = output<void>();
  readonly markDelivered = output<string>();
  readonly printInvoice = output<string>();

  protected getStatusLabel(status: ManagementOrderStatus): string {
    switch (status) {
      case 'CREATED':
        return 'Chờ thanh toán';
      case 'CONFIRMED':
        return 'Đang xử lý';
      case 'SHIPPED':
        return 'Đang giao';
      case 'COMPLETED':
        return 'Đã hoàn thành';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'RETURN_REQUESTED':
        return 'Yêu cầu trả hàng';
      case 'RETURNED':
        return 'Đã trả hàng';
      default:
        return status;
    }
  }

  protected getPaymentStatusLabel(status: ManagementPaymentStatus): string {
    switch (status) {
      case 'SUCCESS':
        return 'Đã thanh toán';
      case 'REFUNDED':
        return 'Đã hoàn tiền';
      case 'PENDING':
      default:
        return 'Chờ thanh toán';
    }
  }

  protected isStepActive(step: ManagementOrderStatus): boolean {
    const current = this.order();
    if (!current) return false;
    return current.orderStatus === step;
  }

  protected isStepCompleted(step: ManagementOrderStatus): boolean {
    const current = this.order();
    if (!current) return false;

    const statuses: ManagementOrderStatus[] = ['CREATED', 'CONFIRMED', 'SHIPPED', 'COMPLETED'];
    const currentIndex = statuses.indexOf(current.orderStatus);
    const stepIndex = statuses.indexOf(step);

    if (currentIndex === -1 || stepIndex === -1) return false;
    return currentIndex >= stepIndex;
  }

  protected getStepTime(step: ManagementOrderStatus): Date | null {
    const current = this.order();
    if (!current) return null;

    if (!this.isStepCompleted(step)) return null;

    const baseDate = new Date(current.createdAt);
    switch (step) {
      case 'CREATED':
        return baseDate;
      case 'CONFIRMED':
        return new Date(baseDate.getTime() + 15 * 60 * 1000);
      case 'SHIPPED':
        return new Date(baseDate.getTime() + 150 * 60 * 1000); // 2 hours 30 mins
      case 'COMPLETED':
        return new Date(baseDate.getTime() + 1680 * 60 * 1000); // 28 hours
      default:
        return null;
    }
  }

  protected getStepperProgressWidth(): string {
    const current = this.order();
    if (!current) return '0%';
    switch (current.orderStatus) {
      case 'CREATED':
        return '0%';
      case 'CONFIRMED':
        return '33.33%';
      case 'SHIPPED':
        return '66.66%';
      case 'COMPLETED':
        return '100%';
      default:
        return '0%';
    }
  }


  protected getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  protected failedImages = new Set<string>();

  protected onImageError(id: string): void {
    this.failedImages.add(id);
  }

  protected isImageFailed(id: string): boolean {
    return this.failedImages.has(id);
  }
}
