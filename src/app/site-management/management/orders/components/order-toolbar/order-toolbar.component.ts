import { Component, input, output } from '@angular/core';
import { LucideCalendar, LucideFilter, LucideSearch, LucideX } from '@lucide/angular';
import {
  ManagementOrderDateFilter,
  ManagementOrderSort,
  ManagementOrderStatusFilter,
} from '../../data-access/models/management-order.models';

@Component({
  selector: 'app-order-toolbar',
  standalone: true,
  imports: [LucideCalendar, LucideFilter, LucideSearch, LucideX],
  templateUrl: './order-toolbar.component.html',
  styleUrl: './order-toolbar.component.css',
})
export class OrderToolbarComponent {
  readonly keyword = input.required<string>();
  readonly status = input.required<ManagementOrderStatusFilter>();
  readonly dateFilter = input.required<ManagementOrderDateFilter>();
  readonly sort = input.required<ManagementOrderSort>();
  readonly activeFilterCount = input.required<number>();
  readonly loading = input.required<boolean>();

  readonly keywordChange = output<string>();
  readonly statusChange = output<ManagementOrderStatusFilter>();
  readonly dateFilterChange = output<ManagementOrderDateFilter>();
  readonly sortChange = output<ManagementOrderSort>();
  readonly applyFilters = output<void>();
  readonly resetFilters = output<void>();

  protected onKeywordInput(event: Event): void {
    this.keywordChange.emit(readInputValue(event));
  }

  protected onKeywordEnter(event: Event): void {
    event.preventDefault();
    this.applyFilters.emit();
  }

  protected onStatusChange(event: Event): void {
    this.statusChange.emit(readSelectValue(event) as ManagementOrderStatusFilter);
  }

  protected onDateFilterChange(event: Event): void {
    this.dateFilterChange.emit(readSelectValue(event) as ManagementOrderDateFilter);
  }

  protected onSortChange(event: Event): void {
    this.sortChange.emit(readSelectValue(event) as ManagementOrderSort);
  }
}

function readInputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : '';
}

function readSelectValue(event: Event): string {
  return event.target instanceof HTMLSelectElement ? event.target.value : '';
}
