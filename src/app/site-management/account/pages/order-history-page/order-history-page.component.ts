import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { LucideSearch, LucidePackage, LucideMapPin, LucideCreditCard } from '@lucide/angular';
import { OrderFilter } from '../../data-access/models/account.models';
import { AccountStore } from '../../data-access/store/account.store';

@Component({
  selector: 'app-order-history-page',
  standalone: true,
  imports: [CommonModule, DialogModule, LucideSearch, LucidePackage, LucideMapPin, LucideCreditCard],
  templateUrl: './order-history-page.component.html',
})
export class OrderHistoryPageComponent {
  protected readonly accountStore = inject(AccountStore);
  protected readonly filters: { label: string; value: OrderFilter }[] = [
    { label: '30 ngày', value: 'last30' },
    { label: '6 tháng', value: 'sixMonths' },
    { label: '2026', value: 'year2026' },
    { label: 'Tất cả', value: 'all' },
  ];

  protected isDetailOpen = false;

  protected setFilter(filter: OrderFilter): void {
    this.accountStore.setOrderFilter(filter);
  }

  protected searchOrders(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.accountStore.setOrderSearchKeyword(input.value);
  }

  protected openDetail(orderId: string): void {
    this.accountStore.loadOrderDetail(orderId);
    this.isDetailOpen = true;
  }

  protected statusClass(status: string): string {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'processing':
        return 'bg-[#ffdf94] text-[#6e5400]';
      case 'cancelled':
        return 'bg-[#ffdad6] text-[#93000a]';
      case 'delivered':
        return 'bg-[#d8f5dd] text-[#166534]';
      case 'shipped':
      default:
        return 'bg-[#e2dfff] text-[#3323cc]';
    }
  }
}

