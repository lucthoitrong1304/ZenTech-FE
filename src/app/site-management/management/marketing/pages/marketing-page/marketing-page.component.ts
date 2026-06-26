import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, ChangeDetectionStrategy, effect, inject, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideUserCheck,
  LucidePlus,
  LucideTicket,
  LucideSparkles,
  LucideWallet,
  LucideTrendingUp,
  LucideSearch,
  LucideX,
} from '@lucide/angular';
import { Select } from 'primeng/select';
import { filter, take } from 'rxjs';
import { ConfirmService } from '../../../../../shared/components/confirm/confirm.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { CouponDialogComponent } from '../../components/coupon-dialog/coupon-dialog.component';
import { CouponTableComponent } from '../../components/coupon-table/coupon-table.component';
import { CouponToolbarComponent } from '../../components/coupon-toolbar/coupon-toolbar.component';
import { CustomerVoucherTableComponent } from '../../components/customer-voucher-table/customer-voucher-table.component';
import { IssueVoucherDialogComponent } from '../../components/issue-voucher-dialog/issue-voucher-dialog.component';
import { CustomerVoucherStatus, ManagementCoupon } from '../../data-access/models/marketing.models';
import { MarketingStore } from '../../data-access/store/marketing.store';

@Component({
  selector: 'app-marketing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    LucideUserCheck,
    LucidePlus,
    LucideTicket,
    LucideSparkles,
    LucideWallet,
    LucideTrendingUp,
    LucideSearch,
    LucideX,
    Select,
    CouponToolbarComponent,
    CouponTableComponent,
    CustomerVoucherTableComponent,
    CouponDialogComponent,
    IssueVoucherDialogComponent,
  ],
  templateUrl: './marketing-page.component.html',
  styleUrl: './marketing-page.component.css',
  providers: [MarketingStore],
})
export class MarketingPageComponent {
  protected readonly store = inject(MarketingStore);
  private readonly confirmService = inject(ConfirmService);
  private readonly toastService = inject(ToastService);
  protected readonly voucherStatusOptions = [
    { label: 'Tất cả trạng thái', value: 'all' },
    { label: 'Sẵn có (chưa sử dụng)', value: CustomerVoucherStatus.AVAILABLE },
    { label: 'Đã sử dụng', value: CustomerVoucherStatus.USED },
    { label: 'Đã hết hạn', value: CustomerVoucherStatus.EXPIRED },
  ];

  constructor() {
    this.store.loadAll();

    effect(() => {
      const success = this.store.successMessage();
      if (success) {
        untracked(() => {
          this.toastService.success(success);
          this.store.clearMessages();
        });
      }
    });

    effect(() => {
      const error = this.store.errorMessage();
      if (error) {
        untracked(() => {
          this.toastService.error(error);
          this.store.clearMessages();
        });
      }
    });
  }

  protected onCreateCoupon(): void {
    this.store.openCreateDialog();
  }

  protected onEditCoupon(coupon: ManagementCoupon): void {
    this.store.openEditDialog(coupon.id);
  }

  protected onDeleteCoupon(coupon: ManagementCoupon): void {
    this.confirmService
      .open({
        title: 'Xóa mã ưu đãi',
        content: `Bạn có chắc chắn muốn xóa mã "${coupon.code}" ra khỏi hệ thống không? Hành động này không thể hoàn tác.`,
      })
      .pipe(
        take(1),
        filter(Boolean)
      )
      .subscribe(() => {
        this.store.deleteCoupon(coupon.id);
      });
  }

  protected onToggleActive(coupon: ManagementCoupon): void {
    this.store.toggleActive(coupon.id);
  }

  protected onIssueCoupon(coupon: ManagementCoupon): void {
    this.store.openIssueDialog(coupon.id);
  }

  protected onRevokeVoucher(voucherId: string): void {
    this.confirmService
      .open({
        title: 'Thu hồi voucher',
        content: 'Bạn có chắc chắn muốn thu hồi voucher này không? Voucher sẽ biến mất khỏi ví tài khoản của khách hàng.',
      })
      .pipe(
        take(1),
        filter(Boolean)
      )
      .subscribe(() => {
        this.store.revokeVoucher(voucherId);
      });
  }
}
