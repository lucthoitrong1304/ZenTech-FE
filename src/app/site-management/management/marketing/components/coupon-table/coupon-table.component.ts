import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import {
  LucideTicket,
  LucidePlus,
  LucideEdit,
  LucideTrash2,
} from '@lucide/angular';
import { CouponType, ManagementCoupon } from '../../data-access/models/marketing.models';

@Component({
  selector: 'app-coupon-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    LucideTicket,
    LucidePlus,
    LucideEdit,
    LucideTrash2,
  ],
  templateUrl: './coupon-table.component.html',
  styleUrl: './coupon-table.component.css',
})
export class CouponTableComponent {
  coupons = input<ManagementCoupon[]>([]);
  loading = input<boolean>(false);
  page = input<number>(0);
  totalPages = input<number>(0);
  totalElements = input<number>(0);
  pageStart = input<number>(0);
  pageEnd = input<number>(0);
  canGoPrevious = input<boolean>(false);
  canGoNext = input<boolean>(false);
  canUpdate = input<boolean>(false);
  canDelete = input<boolean>(false);
  canIssue = input<boolean>(false);

  editCoupon = output<ManagementCoupon>();
  deleteCoupon = output<ManagementCoupon>();
  toggleActive = output<ManagementCoupon>();
  issueCoupon = output<ManagementCoupon>();
  pageChange = output<number>();

  protected readonly CouponType = CouponType;

  protected isExpired(coupon: ManagementCoupon): boolean {
    if (!coupon.endAt) {
      return false;
    }
    return new Date(coupon.endAt).getTime() < Date.now();
  }

  protected isUpcoming(coupon: ManagementCoupon): boolean {
    if (!coupon.startAt) {
      return false;
    }
    return new Date(coupon.startAt).getTime() > Date.now();
  }
}
