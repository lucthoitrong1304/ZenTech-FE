import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import {
  LucideRefreshCcw,
  LucideSearch,
  LucideSlidersHorizontal,
} from '@lucide/angular';
import {
  CustomerActiveFilter,
  CustomerSort,
} from '../../data-access/models/customer.models';

@Component({
  selector: 'app-customer-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    LucideRefreshCcw,
    LucideSearch,
    LucideSlidersHorizontal,
  ],
  templateUrl: './customer-toolbar.component.html',
  styleUrl: './customer-toolbar.component.css',
})
export class CustomerToolbarComponent {
  readonly keyword = input.required<string>();
  readonly activeFilter = input.required<CustomerActiveFilter>();
  readonly sort = input.required<CustomerSort>();
  readonly loading = input.required<boolean>();
  readonly countLabel = input.required<string>();

  readonly keywordChange = output<string>();
  readonly activeFilterChange = output<CustomerActiveFilter>();
  readonly sortChange = output<CustomerSort>();
  readonly refresh = output<void>();

  protected onKeywordInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement | null;
    this.keywordChange.emit(inputElement?.value ?? '');
  }

  protected onActiveFilterChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement | null;
    const value = selectElement?.value;

    if (value === 'all' || value === 'active' || value === 'inactive') {
      this.activeFilterChange.emit(value);
    }
  }

  protected onSortChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement | null;
    const value = selectElement?.value;

    if (
      value === 'registeredAt,desc' ||
      value === 'registeredAt,asc' ||
      value === 'fullName,asc' ||
      value === 'email,asc'
    ) {
      this.sortChange.emit(value);
    }
  }
}
