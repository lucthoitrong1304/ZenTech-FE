import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideCreditCard } from '@lucide/angular';
import { ToastService } from '@/shared/components/toast/toast.service';
import { AuthSessionStore } from '@/site-management/identity/data-access/store/auth-session.store';
import { CartSummaryComponent } from '@/site-management/customer/cart/components/cart-summary/cart-summary.component';
import { CheckoutPaymentMethod } from '@/site-management/customer/cart/data-access/models/checkout.model';
import { CheckoutStore } from '@/site-management/customer/cart/data-access/store/checkout.store';
import { CartStore } from '@/site-management/customer/cart/data-access/store/cart.store';
import { CategoryNavigationStore } from '@/site-management/customer/shell/data-access/store/category-navigation.store';
import { SiteHeaderContainerComponent } from '@/site-management/customer/shell/components/site-header/site-header-container.component';

@Component({
  selector: 'app-checkout-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  providers: [CheckoutStore],
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    SiteHeaderContainerComponent,
    CartSummaryComponent,
    LucideArrowLeft,
    LucideCreditCard,
  ],
  templateUrl: './checkout-page.component.html',
  styleUrl: './checkout-page.component.css',
})
export class CheckoutPageComponent {
  private readonly authSessionStore = inject(AuthSessionStore);
  private readonly categoryNavigationStore = inject(CategoryNavigationStore);
  private readonly checkoutStore = inject(CheckoutStore);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  protected readonly cartStore = inject(CartStore);

  protected readonly navItems = this.categoryNavigationStore.navItems;
  protected readonly currentUser = this.authSessionStore.currentUser;
  protected readonly addressOptions = this.checkoutStore.addressOptions;
  protected readonly voucherOptions = this.checkoutStore.voucherOptions;
  protected readonly selectedAddressId = this.checkoutStore.selectedAddressId;
  protected readonly selectedVoucherId = this.checkoutStore.selectedVoucherId;
  protected readonly voucherCode = this.checkoutStore.voucherCode;
  protected readonly paymentMethod = this.checkoutStore.paymentMethod;
  protected readonly addressLoading = this.checkoutStore.addressLoading;
  protected readonly voucherLoading = this.checkoutStore.voucherLoading;
  protected readonly checkoutSubmitting = this.checkoutStore.submitting;
  protected readonly checkoutError = this.checkoutStore.error;
  protected readonly shippingFee = this.checkoutStore.shippingFee;
  protected readonly discount = this.checkoutStore.discount;
  protected readonly total = this.checkoutStore.total;
  protected readonly canSubmit = this.checkoutStore.canSubmit;

  protected readonly paymentMethods: { value: CheckoutPaymentMethod; label: string; description: string }[] = [
    { value: 'CASH', label: 'COD', description: 'Thanh toán khi nhận hàng' },
    { value: 'VNPAY', label: 'VNPAY', description: 'ATM, QR, thẻ ngân hàng' },
    { value: 'MOMO', label: 'MoMo', description: 'Ví MoMo và thẻ hỗ trợ' },
  ];

  constructor() {
    effect(() => {
      if (!this.authSessionStore.isAuthenticated()) {
        untracked(() => this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/checkout' } }));
        return;
      }
      untracked(() => {
        this.checkoutStore.loadAddresses();
        this.checkoutStore.loadVouchers();
      });
    });

    effect(() => {
      if (this.authSessionStore.isAuthenticated() && this.cartStore.isEmpty() && !this.checkoutSubmitting() && !this.checkoutStore.completion()) {
        untracked(() => this.router.navigate(['/cart']));
      }
    });

    effect(() => {
      const message = this.checkoutStore.actionMessage();
      if (message) {
        untracked(() => {
          this.toastService.success(message);
          this.checkoutStore.consumeActionMessage();
        });
      }
    });

    effect(() => {
      const completion = this.checkoutStore.completion();
      if (!completion) {
        return;
      }
      untracked(() => {
        this.checkoutStore.consumeCompletion();
        if (completion.paymentUrl) {
          window.location.assign(completion.paymentUrl);
          return;
        }
        this.toastService.success('Đặt hàng thành công. Đơn đang chờ xác nhận thanh toán COD.');
        this.router.navigate(['/checkout/result'], {
          queryParams: { orderId: completion.orderId, gateway: 'CASH', status: 'pending' },
        });
      });
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
  }

  protected onCheckout(): void {
    this.checkoutStore.submit();
  }

  protected setSelectedAddress(addressId: string): void {
    this.checkoutStore.setAddress(addressId);
  }

  protected setPaymentMethod(method: CheckoutPaymentMethod): void {
    this.checkoutStore.setPaymentMethod(method);
  }

  protected setSelectedVoucher(voucherId: string | null): void {
    this.checkoutStore.selectVoucher(voucherId);
  }

  protected applyVoucherCode(): void {
    this.checkoutStore.applyVoucherCode();
  }

  protected onVoucherCodeChange(value: string): void {
    this.checkoutStore.setVoucherCode(value);
  }

  protected onLogout(): void {
    this.authSessionStore.logout();
  }
}
