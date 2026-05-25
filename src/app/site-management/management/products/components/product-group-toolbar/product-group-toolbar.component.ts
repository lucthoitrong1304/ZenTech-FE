import { Component, input, output } from '@angular/core';
import { LucideFilter, LucideSearch, LucideX } from '@lucide/angular';
import {
  ManagementProductGroupQuery,
} from '../../data-access/models/management-product.models';

@Component({
  selector: 'app-product-group-toolbar',
  standalone: true,
  imports: [LucideFilter, LucideSearch, LucideX],
  templateUrl: './product-group-toolbar.component.html',
  styleUrl: './product-group-toolbar.component.css',
})
export class ProductGroupToolbarComponent {
  readonly keyword = input.required<string>();
  readonly activeFilter = input.required<ManagementProductGroupQuery['activeFilter']>();
  readonly sort = input.required<ManagementProductGroupQuery['sort']>();
  readonly activeFilterCount = input.required<number>();
  readonly loading = input.required<boolean>();

  readonly keywordChange = output<string>();
  readonly activeFilterChange = output<ManagementProductGroupQuery['activeFilter']>();
  readonly sortChange = output<ManagementProductGroupQuery['sort']>();
  readonly applyFilters = output<void>();
  readonly resetFilters = output<void>();

  protected onKeywordInput(event: Event): void {
    this.keywordChange.emit(readInputValue(event));
  }

  protected onKeywordEnter(event: Event): void {
    event.preventDefault();
    this.applyFilters.emit();
  }

  protected onActiveFilterChange(event: Event): void {
    this.activeFilterChange.emit(
      readSelectValue(event) as ManagementProductGroupQuery['activeFilter']
    );
  }

  protected onSortChange(event: Event): void {
    this.sortChange.emit(readSelectValue(event) as ManagementProductGroupQuery['sort']);
  }
}

function readInputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : '';
}

function readSelectValue(event: Event): string {
  return event.target instanceof HTMLSelectElement ? event.target.value : '';
}
