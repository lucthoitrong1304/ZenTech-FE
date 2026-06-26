import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { LucideUserCheck, LucideTrash2 } from '@lucide/angular';
import { CouponType, CustomerVoucherDetail, CustomerVoucherStatus } from '../../data-access/models/marketing.models';

@Component({
  selector: 'app-customer-voucher-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, LucideUserCheck, LucideTrash2],
  templateUrl: './customer-voucher-table.component.html',
  styleUrl: './customer-voucher-table.component.css',
})
export class CustomerVoucherTableComponent {
  vouchers = input<CustomerVoucherDetail[]>([]);
  loading = input<boolean>(false);
  page = input<number>(0);
  totalPages = input<number>(0);
  totalElements = input<number>(0);
  pageStart = input<number>(0);
  pageEnd = input<number>(0);
  canGoPrevious = input<boolean>(false);
  canGoNext = input<boolean>(false);

  pageChange = output<number>();
  revoke = output<string>();

  protected readonly CouponType = CouponType;
  protected readonly CustomerVoucherStatus = CustomerVoucherStatus;

  protected onRevoke(id: string): void {
    this.revoke.emit(id);
  }
}
