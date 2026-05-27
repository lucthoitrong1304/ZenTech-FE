import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { LucidePrinter, LucideX } from '@lucide/angular';
import {
  ManagementOrder,
  ManagementOrderStatus,
  ManagementPaymentStatus,
} from '../../data-access/models/management-order.models';

@Component({
  selector: 'app-order-detail-drawer',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, LucidePrinter, LucideX],
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
}
