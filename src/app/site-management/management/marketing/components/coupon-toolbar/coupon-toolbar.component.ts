import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucideX } from '@lucide/angular';
import { CouponType, ManagementCouponQuery } from '../../data-access/models/marketing.models';

@Component({
  selector: 'app-coupon-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideSearch, LucideX],
  templateUrl: './coupon-toolbar.component.html',
  styleUrl: './coupon-toolbar.component.css',
})
export class CouponToolbarComponent {
  keyword = input<string>('');
  couponType = input<ManagementCouponQuery['type']>('all');
  activeStatus = input<ManagementCouponQuery['active']>('all');
  activeFilterCount = input<number>(0);
  loading = input<boolean>(false);

  keywordChange = output<string>();
  typeChange = output<ManagementCouponQuery['type']>();
  activeChange = output<ManagementCouponQuery['active']>();
  applyFilters = output<void>();
  resetFilters = output<void>();

  protected readonly couponTypes = [
    { label: 'Tất cả các loại', value: 'all' },
    { label: 'Phần trăm (%)', value: CouponType.PERCENTAGE },
    { label: 'Số tiền cố định (đ)', value: CouponType.FIXED_AMOUNT },
    { label: 'Miễn phí vận chuyển', value: CouponType.FREE_SHIPPING },
  ];

  protected readonly activeOptions = [
    { label: 'Tất cả trạng thái', value: 'all' },
    { label: 'Đang hoạt động', value: true },
    { label: 'Tạm dừng', value: false },
  ];

  protected onKeywordInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.keywordChange.emit(value);
  }

  protected onTypeChange(value: string): void {
    this.typeChange.emit(value as ManagementCouponQuery['type']);
  }

  protected onActiveChange(value: string): void {
    let parsed: ManagementCouponQuery['active'] = 'all';
    if (value === 'true') {
      parsed = true;
    } else if (value === 'false') {
      parsed = false;
    }
    this.activeChange.emit(parsed);
  }
}
