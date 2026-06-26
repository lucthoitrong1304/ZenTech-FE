import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideEye,
  LucideLock,
  LucideUnlock,
} from '@lucide/angular';
import { CustomerSummary } from '../../data-access/models/customer.models';

@Component({
  selector: 'app-customer-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    LucideChevronLeft,
    LucideChevronRight,
    LucideEye,
    LucideLock,
    LucideUnlock,
  ],
  templateUrl: './customer-table.component.html',
  styleUrl: './customer-table.component.css',
})
export class CustomerTableComponent {
  readonly customers = input.required<CustomerSummary[]>();
  readonly loading = input.required<boolean>();
  readonly empty = input.required<boolean>();
  readonly page = input.required<number>();
  readonly size = input.required<number>();
  readonly totalElements = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly viewCustomer = output<string>();
  readonly pageChange = output<{ page: number; size: number }>();
  readonly statusChange = output<{ customerId: string; active: boolean }>();

  protected readonly skeletonRows = Array.from({ length: 5 });

  protected getDisplayIndex(index: number): number {
    return this.page() * this.size() + index + 1;
  }

  protected get firstItemIndex(): number {
    if (this.totalElements() === 0) {
      return 0;
    }

    return this.page() * this.size() + 1;
  }

  protected get lastItemIndex(): number {
    return Math.min((this.page() + 1) * this.size(), this.totalElements());
  }

  protected previousPage(): void {
    if (this.page() <= 0 || this.loading()) {
      return;
    }

    this.pageChange.emit({ page: this.page() - 1, size: this.size() });
  }

  protected failedImages = new Set<string>();

  protected onImageError(customerId: string): void {
    this.failedImages.add(customerId);
  }

  protected isImageFailed(customerId: string): boolean {
    return this.failedImages.has(customerId);
  }

  protected nextPage(): void {
    if (this.page() + 1 >= this.totalPages() || this.loading()) {
      return;
    }

    this.pageChange.emit({ page: this.page() + 1, size: this.size() });
  }
}
