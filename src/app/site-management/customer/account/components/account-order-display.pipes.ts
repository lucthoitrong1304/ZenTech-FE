import { Pipe, PipeTransform } from '@angular/core';
import { CustomerOrderCouponResponse } from '@/site-management/customer/account/data-access/models/account.models';

@Pipe({ name: 'orderStatusClass', standalone: true })
export class OrderStatusClassPipe implements PipeTransform {
  transform(status: string, paymentStatus?: string): string {
    const normalizedStatus = status.toLowerCase();
    const normalizedPaymentStatus = paymentStatus?.toUpperCase();

    if (normalizedStatus === 'created' && (normalizedPaymentStatus === 'SUCCESS' || normalizedPaymentStatus === 'PAID')) {
      return 'bg-[#e2dfff] text-[#3323cc]';
    }

    switch (normalizedStatus) {
      case 'pending':
      case 'created':
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
      default:
        return 'bg-[#e2dfff] text-[#3323cc]';
    }
  }
}

@Pipe({ name: 'orderStatusLabel', standalone: true })
export class OrderStatusLabelPipe implements PipeTransform {
  transform(status: string, paymentStatus?: string): string {
    const normalized = status.toUpperCase();
    if (normalized === 'CREATED') {
      return paymentStatus?.toUpperCase() === 'SUCCESS' || paymentStatus?.toUpperCase() === 'PAID'
        ? 'Chờ xác nhận'
        : 'Chờ thanh toán';
    }

    return ({
      PENDING: 'Chờ thanh toán',
      CONFIRMED: 'Đang xử lý',
      PROCESSING: 'Đang xử lý',
      SHIPPED: 'Đang giao hàng',
      DELIVERED: 'Đã hoàn thành',
      COMPLETED: 'Đã hoàn thành',
      CANCELLED: 'Đã hủy',
      RETURN_REQUESTED: 'Yêu cầu trả hàng',
      RETURNED: 'Đã trả hàng',
    } as Record<string, string>)[normalized] ?? status;
  }
}

@Pipe({ name: 'paymentStatusLabel', standalone: true })
export class PaymentStatusLabelPipe implements PipeTransform {
  transform(status: string): string {
    return ({ PAID: 'Đã thanh toán', SUCCESS: 'Đã thanh toán', UNPAID: 'Chưa thanh toán', PENDING: 'Chưa thanh toán', REFUNDED: 'Đã hoàn tiền' } as Record<string, string>)[status.toUpperCase()] ?? status;
  }
}

@Pipe({ name: 'paymentMethodLabel', standalone: true })
export class PaymentMethodLabelPipe implements PipeTransform {
  transform(method: string): string {
    return ({ COD: 'COD (Nhận hàng trả tiền)', CASH: 'COD (Nhận hàng trả tiền)', VNPAY: 'Cổng VNPAY', MOMO: 'Ví MoMo', STRIPE: 'Thẻ Stripe' } as Record<string, string>)[method.toUpperCase()] ?? method;
  }
}

@Pipe({ name: 'couponTypeLabel', standalone: true })
export class CouponTypeLabelPipe implements PipeTransform {
  transform(coupon: CustomerOrderCouponResponse): string {
    if (coupon.couponType === 'PERCENTAGE') return `Giảm ${coupon.discountValue}%`;
    if (coupon.couponType === 'FIXED_AMOUNT') return `Giảm ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(coupon.discountValue).replace(/\s/g, '')}`;
    return coupon.couponType === 'FREE_SHIPPING' ? 'Miễn phí vận chuyển' : coupon.couponType;
  }
}
