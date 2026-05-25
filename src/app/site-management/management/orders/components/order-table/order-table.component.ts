import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideEye,
  LucidePencil,
  LucideShoppingBag,
} from '@lucide/angular';
import {
  ManagementOrder,
  ManagementOrderStatus,
  ManagementPaymentMethod,
} from '../../data-access/models/management-order.models';

@Component({
  selector: 'app-order-table',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    LucideChevronLeft,
    LucideChevronRight,
    LucideEye,
    LucidePencil,
    LucideShoppingBag,
  ],
  templateUrl: './order-table.component.html',
  styleUrl: './order-table.component.css',
})
export class OrderTableComponent {
  readonly orders = input.required<ManagementOrder[]>();
  readonly loading = input.required<boolean>();
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalElements = input.required<number>();
  readonly pageStart = input.required<number>();
  readonly pageEnd = input.required<number>();
  readonly canGoPrevious = input.required<boolean>();
  readonly canGoNext = input.required<boolean>();

  readonly viewOrder = output<string>();
  readonly editOrder = output<ManagementOrder>();
  readonly pageChange = output<number>();

  protected readonly skeletonRows = Array.from({ length: 4 });
  protected readonly pageSlots = Array.from({ length: 5 }, (_, index) => index);

  protected getStatusLabel(status: ManagementOrderStatus): string {
    switch (status) {
      case 'DELIVERED':
        return 'Đã giao';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'PAYMENT_PENDING':
        return 'Chờ thanh toán';
      case 'PROCESSING':
      default:
        return 'Đang xử lý';
    }
  }

  protected getPaymentMethodLabel(method: ManagementPaymentMethod): string {
    return method === 'COD' ? 'COD' : method;
  }

  protected getPageNumber(slot: number): number | null {
    const totalPages = this.totalPages();

    if (totalPages <= 0) {
      return null;
    }

    const start = Math.min(Math.max(this.page() - 2, 0), Math.max(totalPages - 5, 0));
    const page = start + slot;

    return page < totalPages ? page : null;
  }
}
