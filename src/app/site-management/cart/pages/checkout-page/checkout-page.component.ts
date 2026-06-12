import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import {
  CustomerAddressResponse,
  CustomerVoucherResponse,
} from '../../../account/data-access/models/account.models';
import { AccountService } from '../../../account/data-access/services/account.service';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { CategoryNavigationStore } from '../../../shared/data-access/store/category-navigation.store';
import { SiteHeaderComponent } from '../../../shared/site-header/site-header.component';
import { CartSummaryComponent } from '../../components/cart-summary/cart-summary.component';
import { CheckoutPaymentMethod } from '../../data-access/models/checkout.model';
import { CheckoutService } from '../../data-access/services/checkout.service';
import { CartStore } from '../../data-access/store/cart.store';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SiteHeaderComponent, CartSummaryComponent],
  templateUrl: './checkout-page.component.html',
  styleUrl: './checkout-page.component.css',
})
export class CheckoutPageComponent {
  private static readonly DEFAULT_SHIPPING_FEE = 25000;

  private readonly authSessionStore = inject(AuthSessionStore);
  private readonly categoryNavigationStore = inject(CategoryNavigationStore);
  private readonly accountService = inject(AccountService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  protected readonly cartStore = inject(CartStore);

  protected readonly navItems = this.categoryNavigationStore.navItems;
  protected readonly currentUser = this.authSessionStore.currentUser;
  protected readonly addresses = signal<CustomerAddressResponse[]>([]);
  protected readonly vouchers = signal<CustomerVoucherResponse[]>([]);
  protected readonly selectedAddressId = signal<string | null>(null);
  protected readonly selectedVoucherId = signal<string | null>(null);
  protected readonly voucherCode = signal('');
  protected readonly paymentMethod = signal<CheckoutPaymentMethod>('CASH');
  protected readonly addressLoading = signal(false);
  protected readonly voucherLoading = signal(false);
  protected readonly checkoutSubmitting = signal(false);
  protected readonly checkoutError = signal<string | null>(null);
  private readonly checkoutCreated = signal(false);
  protected readonly paymentMethods: { value: CheckoutPaymentMethod; label: string; description: string }[] = [
    {
      value: 'CASH',
      label: 'COD',
      description: 'Thanh toán khi nhận hàng',
    },
    {
      value: 'VNPAY',
      label: 'VNPAY',
      description: 'ATM, QR, thẻ ngân hàng',
    },
    {
      value: 'MOMO',
      label: 'MoMo',
      description: 'Ví MoMo và thẻ hỗ trợ',
    },
  ];

  constructor() {
    effect(() => {
      if (!this.authSessionStore.isAuthenticated()) {
        untracked(() => this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/checkout' } }));
      } else {
        untracked(() => {
          this.loadAddresses();
          this.loadVouchers();
        });
      }
    });

    effect(() => {
      if (
        this.authSessionStore.isAuthenticated()
        && this.cartStore.isEmpty()
        && !this.checkoutSubmitting()
        && !this.checkoutCreated()
      ) {
        untracked(() => this.router.navigate(['/cart']));
      }
    });

    effect(() => {
      const message = this.authSessionStore.logoutSuccessMessage();

      if (message) {
        untracked(() => {
          this.toastService.success(message);
          this.authSessionStore.clearLogoutMessages();
          this.router.navigate(['/']);
        });
      }
    });

    effect(() => {
      const message = this.authSessionStore.logoutWarningMessage();

      if (message) {
        untracked(() => {
          this.toastService.warning(message);
          this.authSessionStore.clearLogoutMessages();
          this.router.navigate(['/']);
        });
      }
    });
  }

  protected onCheckout(): void {
    if (this.cartStore.isEmpty()) {
      this.router.navigate(['/cart']);
      return;
    }

    const addressId = this.selectedAddressId();
    if (!addressId) {
      this.checkoutError.set('Vui lòng chọn địa chỉ giao hàng trước khi thanh toán.');
      return;
    }

    this.checkoutSubmitting.set(true);
    this.checkoutError.set(null);

    this.checkoutService
      .checkout({
        addressId,
        paymentMethod: this.paymentMethod(),
        customerVoucherId: this.selectedVoucherId() || undefined,
        items: this.cartStore.items().map(item => ({
          productVariantId: item.variantId,
          quantity: item.quantity,
        })),
      })
      .subscribe({
        next: response => {
          const checkout = response.data;
          this.checkoutCreated.set(true);
          this.cartStore.clearCart();

          if (checkout.paymentUrl) {
            window.location.href = checkout.paymentUrl;
            return;
          }

          this.toastService.success('Đặt hàng thành công. Đơn đang chờ xác nhận thanh toán COD.');
          this.router.navigate(['/checkout/result'], {
            queryParams: { orderId: checkout.orderId, gateway: 'CASH', status: 'pending' },
          });
        },
        error: error => {
          this.checkoutSubmitting.set(false);
          this.checkoutError.set(this.extractErrorMessage(error));
        },
        complete: () => {
          this.checkoutSubmitting.set(false);
        },
      });
  }

  protected setSelectedAddress(addressId: string): void {
    this.selectedAddressId.set(addressId);
    this.checkoutError.set(null);
  }

  protected setPaymentMethod(method: CheckoutPaymentMethod): void {
    this.paymentMethod.set(method);
    this.checkoutError.set(null);
  }

  protected setSelectedVoucher(voucherId: string | null): void {
    this.selectedVoucherId.set(voucherId);
    const selectedVoucher = this.vouchers().find(voucher => voucher.voucherId === voucherId);
    this.voucherCode.set(selectedVoucher?.couponCode || '');
    this.checkoutError.set(null);
  }

  protected applyVoucherCode(): void {
    const code = this.voucherCode().trim().toUpperCase();
    if (!code) {
      this.setSelectedVoucher(null);
      return;
    }

    const voucher = this.vouchers().find(item => item.couponCode.toUpperCase() === code);
    if (!voucher) {
      this.selectedVoucherId.set(null);
      this.checkoutError.set('Mã giảm giá không tồn tại trong ví voucher của bạn.');
      return;
    }
    if (!this.isVoucherEligible(voucher)) {
      this.selectedVoucherId.set(null);
      this.checkoutError.set(this.getVoucherDescription(voucher));
      return;
    }

    this.setSelectedVoucher(voucher.voucherId);
    this.toastService.success(`Đã áp dụng mã ${voucher.couponCode}`);
  }

  protected onVoucherCodeChange(value: string): void {
    this.voucherCode.set(value);
    this.checkoutError.set(null);
    if (!value.trim()) {
      this.selectedVoucherId.set(null);
    }
  }

  protected getAddressText(address: CustomerAddressResponse): string {
    return [address.street, address.ward, address.province].filter(Boolean).join(', ');
  }

  protected isVoucherEligible(voucher: CustomerVoucherResponse): boolean {
    return voucher.status === 'AVAILABLE' && this.cartStore.subtotal() >= voucher.minOrderAmount;
  }

  protected getVoucherLabel(voucher: CustomerVoucherResponse): string {
    if (voucher.couponType === 'PERCENTAGE') {
      return `Giảm ${voucher.discountValue}%`;
    }
    if (voucher.couponType === 'FIXED_AMOUNT') {
      return `Giảm ${this.formatCurrency(voucher.discountValue)}`;
    }
    return 'Miễn phí vận chuyển';
  }

  protected getVoucherDescription(voucher: CustomerVoucherResponse): string {
    const minAmount = this.formatCurrency(voucher.minOrderAmount);
    const maxDiscount = voucher.maxDiscount > 0 ? `, tối đa ${this.formatCurrency(voucher.maxDiscount)}` : '';
    const eligible = this.isVoucherEligible(voucher) ? 'Có thể áp dụng' : `Cần đơn từ ${minAmount}`;
    return `${eligible}${voucher.couponType === 'PERCENTAGE' ? maxDiscount : ''}`;
  }

  protected selectedVoucher(): CustomerVoucherResponse | null {
    return this.vouchers().find(voucher => voucher.voucherId === this.selectedVoucherId()) || null;
  }

  protected discountPreview(): number {
    const voucher = this.selectedVoucher();
    if (!voucher || !this.isVoucherEligible(voucher)) {
      return 0;
    }

    const subtotal = this.cartStore.subtotal();
    if (voucher.couponType === 'PERCENTAGE') {
      const discount = subtotal * voucher.discountValue / 100;
      return voucher.maxDiscount > 0 ? Math.min(discount, voucher.maxDiscount) : discount;
    }
    if (voucher.couponType === 'FIXED_AMOUNT') {
      return Math.min(voucher.discountValue, subtotal);
    }
    if (voucher.couponType === 'FREE_SHIPPING') {
      return this.shippingFeePreview();
    }
    return 0;
  }

  protected shippingFeePreview(): number {
    return this.cartStore.isEmpty() ? 0 : CheckoutPageComponent.DEFAULT_SHIPPING_FEE;
  }

  protected payableTotal(): number {
    return Math.max(0, this.cartStore.subtotal() + this.shippingFeePreview() - this.discountPreview());
  }

  protected onLogout(): void {
    this.authSessionStore.logout();
  }

  private loadAddresses(): void {
    if (this.addressLoading() || this.addresses().length > 0) {
      return;
    }

    this.addressLoading.set(true);
    this.accountService.getAddresses().subscribe({
      next: response => {
        const addresses = response.data || [];
        this.addresses.set(addresses);
        const defaultAddress = addresses.find(address => address.isDefault) || addresses[0];
        this.selectedAddressId.set(defaultAddress?.addressId || null);
      },
      error: () => {
        this.checkoutError.set('Không thể tải địa chỉ giao hàng. Vui lòng thử lại.');
      },
      complete: () => {
        this.addressLoading.set(false);
      },
    });
  }

  private loadVouchers(): void {
    if (this.voucherLoading() || this.vouchers().length > 0) {
      return;
    }

    this.voucherLoading.set(true);
    this.accountService.getVouchers(0, 100, 'issuedAt,desc', 'AVAILABLE').subscribe({
      next: response => {
        this.vouchers.set(response.data?.content || []);
      },
      error: () => {
        this.checkoutError.set('Không thể tải mã giảm giá. Bạn vẫn có thể thanh toán không dùng voucher.');
      },
      complete: () => {
        this.voucherLoading.set(false);
      },
    });
  }

  private extractErrorMessage(error: unknown): string {
    const maybeError = error as { error?: { message?: string; errors?: string[] } };
    if (maybeError.error?.errors?.length) {
      return maybeError.error.errors.join(', ');
    }
    return maybeError.error?.message || 'Không thể tạo đơn thanh toán. Vui lòng thử lại.';
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(value)
      .replace(/\s/g, '');
  }
}
