import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { LucideSearch, LucidePackage, LucideMapPin, LucideCreditCard, LucideTrash2, LucideUploadCloud, LucideAlertCircle } from '@lucide/angular';
import { CustomerOrderHistoryResponse, OrderFilter } from '@/site-management/customer/account/data-access/models/account.models';
import { AccountStore } from '@/site-management/customer/account/data-access/store/account.store';
import { ToastService } from '@/shared/components/toast/toast.service';
import {
  CouponTypeLabelPipe,
  OrderStatusClassPipe,
  OrderStatusLabelPipe,
  PaymentMethodLabelPipe,
  PaymentStatusLabelPipe,
} from '@/site-management/customer/account/components/account-order-display.pipes';

@Component({
  selector: 'app-order-history-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    LucideSearch,
    LucidePackage,
    LucideMapPin,
    LucideCreditCard,
    LucideTrash2,
    LucideUploadCloud,
    LucideAlertCircle,
    OrderStatusClassPipe,
    OrderStatusLabelPipe,
    PaymentStatusLabelPipe,
    PaymentMethodLabelPipe,
    CouponTypeLabelPipe,
  ],
  templateUrl: './order-history-page.component.html',
})
export class OrderHistoryPageComponent {
  protected readonly accountStore = inject(AccountStore);
  private readonly toastService = inject(ToastService);

  protected readonly filters: { label: string; value: OrderFilter }[] = [
    { label: '30 ngày', value: 'last30' },
    { label: '6 tháng', value: 'sixMonths' },
    { label: '2026', value: 'year2026' },
    { label: 'Tất cả', value: 'all' },
  ];

  protected isDetailOpen = false;

  // Return dialog properties
  protected isReturnDialogOpen = false;
  protected returningOrder: CustomerOrderHistoryResponse | null = null;
  protected returnReason = '';
  protected returnDetails = '';

  // Reason options for return
  protected readonly reasonOptions = [
    'Sản phẩm bị lỗi kỹ thuật',
    'Giao sai mẫu mã/màu sắc',
    'Bể vỡ/Trầy xước nặng',
    'Sản phẩm không hoạt động',
    'Khác'
  ];

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

  protected cancelOrder(orderId: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) {
      this.accountStore.cancelOrder(orderId);
    }
  }

  constructor() {
    effect(() => {
      const message = this.accountStore.returnSuccessMessage();
      if (!message) {
        return;
      }

      this.toastService.success(message);
      this.isReturnDialogOpen = false;
      this.accountStore.clearReturnSuccessMessage();
    });
    effect(() => {
      const message = this.accountStore.returnFailureMessage();
      if (!message) {
        return;
      }

      this.toastService.error(message);
      this.accountStore.clearReturnFailureMessage();
    });
  }

  protected openReturnDialog(order: CustomerOrderHistoryResponse, event: Event): void {
    event.stopPropagation();
    this.returningOrder = order;
    this.returnReason = '';
    this.returnDetails = '';
    this.accountStore.clearReturnEvidence();
    this.isReturnDialogOpen = true;
  }

  protected selectReason(reason: string): void {
    this.returnReason = reason;
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const files = Array.from(input.files);
    this.accountStore.uploadReturnEvidence(files);
    input.value = '';
  }

  protected removeUploadedFile(id: string): void {
    this.accountStore.removeReturnEvidence(id);
  }

  protected submitReturn(): void {
    if (!this.returnReason) {
      this.toastService.warning('Vui lòng chọn lý do trả hàng');
      return;
    }

    if (!this.returningOrder) {
      return;
    }

    this.accountStore.submitReturnRequest({
      orderId: this.returningOrder.orderId,
      reason: this.returnReason,
      details: this.returnDetails,
    });
  }
}

