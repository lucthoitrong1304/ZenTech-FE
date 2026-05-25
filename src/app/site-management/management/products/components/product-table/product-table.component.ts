import { CurrencyPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucidePackage,
  LucidePencil,
  LucideTrash2,
} from '@lucide/angular';
import {
  ManagementProduct,
  ManagementProductStockStatus,
} from '../../data-access/models/management-product.models';

@Component({
  selector: 'app-product-table',
  standalone: true,
  imports: [
    CurrencyPipe,
    LucideChevronLeft,
    LucideChevronRight,
    LucidePackage,
    LucidePencil,
    LucideTrash2,
  ],
  templateUrl: './product-table.component.html',
  styleUrl: './product-table.component.css',
})
export class ProductTableComponent {
  readonly products = input.required<ManagementProduct[]>();
  readonly loading = input.required<boolean>();
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalElements = input.required<number>();
  readonly pageStart = input.required<number>();
  readonly pageEnd = input.required<number>();
  readonly canGoPrevious = input.required<boolean>();
  readonly canGoNext = input.required<boolean>();

  readonly editProduct = output<ManagementProduct>();
  readonly deleteProduct = output<ManagementProduct>();
  readonly pageChange = output<number>();

  protected readonly skeletonRows = Array.from({ length: 4 });
  protected readonly pageSlots = Array.from({ length: 5 }, (_, index) => index);

  protected getStatusLabel(status: ManagementProductStockStatus): string {
    switch (status) {
      case 'OUT_OF_STOCK':
        return 'Het hang';
      case 'LOW_STOCK':
        return 'Sap het hang';
      case 'IN_STOCK':
      default:
        return 'Con hang';
    }
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
