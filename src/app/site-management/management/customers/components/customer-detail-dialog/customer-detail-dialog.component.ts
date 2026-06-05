import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import {
  LucideChevronDown,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronUp,
  LucideLock,
  LucideUnlock,
} from '@lucide/angular';
import { DialogModule } from 'primeng/dialog';
import { CustomerDetail, CustomerOrderHistory } from '../../data-access/models/customer.models';

@Component({
  selector: 'app-customer-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    DialogModule,
    LucideChevronDown,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronUp,
    LucideLock,
    LucideUnlock,
  ],
  templateUrl: './customer-detail-dialog.component.html',
  styleUrl: './customer-detail-dialog.component.css',
})
export class CustomerDetailDialogComponent {
  protected readonly expandedOrderIds = signal<ReadonlySet<string>>(new Set<string>());

  readonly visible = input.required<boolean>();
  readonly customer = input.required<CustomerDetail | null>();
  readonly loading = input.required<boolean>();
  readonly error = input.required<string | null>();
  readonly orders = input.required<CustomerOrderHistory[]>();
  readonly ordersLoading = input.required<boolean>();
  readonly ordersPage = input.required<number>();
  readonly ordersSize = input.required<number>();
  readonly ordersTotalElements = input.required<number>();
  readonly ordersTotalPages = input.required<number>();

  readonly close = output<void>();
  readonly ordersPageChange = output<{ page: number; size: number }>();
  readonly statusChange = output<{ customerId: string; active: boolean }>();

  protected toggleOrder(orderId: string): void {
    this.expandedOrderIds.update((current) => {
      const next = new Set(current);

      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }

      return next;
    });
  }

  protected isOrderExpanded(orderId: string): boolean {
    return this.expandedOrderIds().has(orderId);
  }

  protected previousOrdersPage(): void {
    if (this.ordersPage() <= 0 || this.ordersLoading()) {
      return;
    }

    this.ordersPageChange.emit({ page: this.ordersPage() - 1, size: this.ordersSize() });
  }

  protected failedImages = new Set<string>();

  protected onImageError(customerId: string): void {
    this.failedImages.add(customerId);
  }

  protected isImageFailed(customerId: string): boolean {
    return this.failedImages.has(customerId);
  }

  protected nextOrdersPage(): void {
    if (this.ordersPage() + 1 >= this.ordersTotalPages() || this.ordersLoading()) {
      return;
    }

    this.ordersPageChange.emit({ page: this.ordersPage() + 1, size: this.ordersSize() });
  }
}
