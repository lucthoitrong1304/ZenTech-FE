import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { LucideSearch, LucidePackage, LucideMapPin, LucideCreditCard, LucideTrash2, LucideUploadCloud, LucideAlertCircle } from '@lucide/angular';
import { CustomerOrderCouponResponse, OrderFilter } from '../../data-access/models/account.models';
import { AccountStore } from '../../data-access/store/account.store';
import { AccountService } from '../../data-access/services/account.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-order-history-page',
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
    LucideAlertCircle
  ],
  templateUrl: './order-history-page.component.html',
})
export class OrderHistoryPageComponent {
  protected readonly accountStore = inject(AccountStore);
  protected readonly accountService = inject(AccountService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly filters: { label: string; value: OrderFilter }[] = [
    { label: '30 ngày', value: 'last30' },
    { label: '6 tháng', value: 'sixMonths' },
    { label: '2026', value: 'year2026' },
    { label: 'Tất cả', value: 'all' },
  ];

  protected isDetailOpen = false;

  // Return dialog properties
  protected isReturnDialogOpen = false;
  protected returningOrder: any = null;
  protected returnReason = '';
  protected returnDetails = '';
  protected isSubmitting = false;

  // Media uploads state
  protected isUploading = false;
  protected uploadedFiles: { fileKey: string; fileName: string; type: string; previewUrl: string }[] = [];
  protected uploadError = '';

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

  protected openReturnDialog(order: any, event: Event): void {
    event.stopPropagation();
    this.returningOrder = order;
    this.returnReason = '';
    this.returnDetails = '';
    this.uploadedFiles = [];
    this.uploadError = '';
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
    this.isUploading = true;
    this.uploadError = '';

    let uploadsCompleted = 0;
    const totalFiles = files.length;

    files.forEach(file => {
      // Validate file size (max 50MB for video, 5MB for image)
      const isVideo = file.type.startsWith('video/');
      const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;

      if (file.size > maxSize) {
        this.uploadError = `Tệp ${file.name} vượt quá dung lượng cho phép (${isVideo ? '50MB' : '5MB'}).`;
        uploadsCompleted++;
        if (uploadsCompleted === totalFiles) {
          this.isUploading = false;
        }
        this.cdr.detectChanges();
        return;
      }

      this.accountService.requestReturnEvidenceUploadPresign(file.name, file.type, file.size)
        .subscribe({
          next: presign => {
            this.accountService.uploadToR2(presign, file)
              .pipe(
                finalize(() => {
                  uploadsCompleted++;
                  if (uploadsCompleted === totalFiles) {
                    this.isUploading = false;
                    this.cdr.detectChanges();
                  }
                })
              )
              .subscribe({
                next: () => {
                  const previewUrl = URL.createObjectURL(file);
                  this.uploadedFiles = [
                    ...this.uploadedFiles,
                    {
                      fileKey: presign.fileKey,
                      fileName: file.name,
                      type: file.type,
                      previewUrl
                    }
                  ];
                  this.cdr.detectChanges();
                },
                error: err => {
                  this.uploadError = `Không thể tải lên tệp ${file.name}: ${err.message || 'Lỗi kết nối'}`;
                  this.cdr.detectChanges();
                }
              });
          },
          error: err => {
            this.uploadError = `Không thể yêu cầu quyền tải lên cho ${file.name}: ${err.message || 'Lỗi máy chủ'}`;
            uploadsCompleted++;
            if (uploadsCompleted === totalFiles) {
              this.isUploading = false;
            }
            this.cdr.detectChanges();
          }
        });
    });

    // Reset input value so same files can be selected again
    input.value = '';
    this.cdr.detectChanges();
  }

  protected removeUploadedFile(index: number): void {
    const file = this.uploadedFiles[index];
    if (file.previewUrl) {
      URL.revokeObjectURL(file.previewUrl);
    }
    this.uploadedFiles = this.uploadedFiles.filter((_, idx) => idx !== index);
    this.cdr.detectChanges();
  }

  protected submitReturn(): void {
    if (!this.returnReason) {
      this.toastService.warning('Vui lòng chọn lý do trả hàng');
      return;
    }

    this.isSubmitting = true;
    const proofKeys = this.uploadedFiles.map(f => f.fileKey).join(',');

    this.accountService.submitReturnRequest(this.returningOrder.orderId, {
      reason: this.returnReason,
      details: this.returnDetails,
      proofFileKeys: proofKeys
    })
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: res => {
          if (res.success) {
            this.toastService.success('Gửi yêu cầu trả hàng thành công');
            this.isReturnDialogOpen = false;
            this.accountStore.loadOrders();
          } else {
            this.toastService.error(res.message || 'Gửi yêu cầu thất bại');
          }
        },
        error: err => {
          this.toastService.error(err.message || 'Đã xảy ra lỗi khi gửi yêu cầu');
        }
      });
  }

  protected statusClass(status: string): string {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
      case 'created':
        return 'bg-[#ffdf94] text-[#6e5400]';
      case 'confirmed':
      case 'processing':
        return 'bg-[#ffdf94] text-[#6e5400]';
      case 'cancelled':
        return 'bg-[#ffdad6] text-[#93000a]';
      case 'delivered':
      case 'completed':
        return 'bg-[#d8f5dd] text-[#166534]';
      case 'return_requested':
        return 'bg-[#fef3c7] text-[#92400e]';
      case 'returned':
        return 'bg-[#fee2e2] text-[#991b1b]';
      case 'shipped':
      default:
        return 'bg-[#e2dfff] text-[#3323cc]';
    }
  }

  protected orderStatusLabel(status: string): string {
    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'CREATED':
        return 'Chờ thanh toán';
      case 'PENDING':
        return 'Chờ thanh toán';
      case 'CONFIRMED':
      case 'PROCESSING':
        return 'Đang xử lý';
      case 'SHIPPED':
        return 'Đang giao hàng';
      case 'DELIVERED':
      case 'COMPLETED':
        return 'Đã hoàn thành';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'RETURN_REQUESTED':
        return 'Yêu cầu trả hàng';
      case 'RETURNED':
        return 'Đã trả hàng';
      default:
        return status;
    }
  }

  protected paymentStatusLabel(status: string): string {
    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'PAID':
      case 'SUCCESS':
        return 'Đã thanh toán';
      case 'UNPAID':
      case 'PENDING':
        return 'Chưa thanh toán';
      case 'REFUNDED':
        return 'Đã hoàn tiền';
      default:
        return status;
    }
  }

  protected paymentMethodLabel(method: string): string {
    const normalized = method.toUpperCase();
    switch (normalized) {
      case 'COD':
      case 'CASH':
        return 'COD (Nhận hàng trả tiền)';
      case 'VNPAY':
        return 'Cổng VNPAY';
      case 'MOMO':
        return 'Ví MoMo';
      case 'STRIPE':
        return 'Thẻ Stripe';
      default:
        return method;
    }
  }

  protected couponTypeLabel(coupon: CustomerOrderCouponResponse): string {
    switch (coupon.couponType) {
      case 'PERCENTAGE':
        return `Giảm ${coupon.discountValue}%`;
      case 'FIXED_AMOUNT':
        return `Giảm ${this.formatCurrency(coupon.discountValue)}`;
      case 'FREE_SHIPPING':
        return 'Miễn phí vận chuyển';
      default:
        return coupon.couponType;
    }
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(value)
      .replace(/\s/g, '');
  }
}

