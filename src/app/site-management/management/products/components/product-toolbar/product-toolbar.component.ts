import { Component, input, output } from '@angular/core';
import { LucideFilter, LucideSearch, LucideX } from '@lucide/angular';
import {
  ManagementProductCategory,
  ManagementProductQuery,
} from '../../data-access/models/management-product.models';

@Component({
  selector: 'app-product-toolbar',
  standalone: true,
  imports: [LucideFilter, LucideSearch, LucideX],
  templateUrl: './product-toolbar.component.html',
  styleUrl: './product-toolbar.component.css',
})
export class ProductToolbarComponent {
  readonly keyword = input.required<string>();
  readonly categoryId = input.required<string>();
  readonly stockStatus = input.required<ManagementProductQuery['stockStatus']>();
  readonly sort = input.required<ManagementProductQuery['sort']>();
  readonly categories = input.required<ManagementProductCategory[]>();
  readonly activeFilterCount = input.required<number>();
  readonly loading = input.required<boolean>();

  readonly keywordChange = output<string>();
  readonly categoryChange = output<string>();
  readonly stockStatusChange = output<ManagementProductQuery['stockStatus']>();
  readonly sortChange = output<ManagementProductQuery['sort']>();
  readonly applyFilters = output<void>();
  readonly resetFilters = output<void>();

  protected onKeywordInput(event: Event): void {
    this.keywordChange.emit(readInputValue(event));
  }

  protected onKeywordEnter(event: Event): void {
    event.preventDefault();
    this.applyFilters.emit();
  }

  protected onCategoryChange(event: Event): void {
    this.categoryChange.emit(readSelectValue(event));
  }

  protected onStockStatusChange(event: Event): void {
    this.stockStatusChange.emit(
      readSelectValue(event) as ManagementProductQuery['stockStatus']
    );
  }

  protected onSortChange(event: Event): void {
    this.sortChange.emit(readSelectValue(event) as ManagementProductQuery['sort']);
  }
}

function readInputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : '';
}

function readSelectValue(event: Event): string {
  return event.target instanceof HTMLSelectElement ? event.target.value : '';
}
