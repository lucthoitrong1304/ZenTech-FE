import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { LucideSearch, LucidePackage, LucideMapPin, LucideCreditCard } from '@lucide/angular';
import { CustomerOrderCouponResponse, OrderFilter } from '../../data-access/models/account.models';
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
      case 'pending':
        return 'bg-[#ffdf94] text-[#6e5400]';
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

  protected orderStatusLabel(status: string): string {
    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'CREATED':
        return 'Mới tạo';
      case 'PENDING':
        return 'Chờ thanh toán';
      case 'PROCESSING':
        return 'Đang xử lý';
      case 'SHIPPED':
        return 'Đang giao hàng';
      case 'DELIVERED':
        return 'Đã giao hàng';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status;
    }
  }

  protected paymentStatusLabel(status: string): string {
    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'PAID':
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

