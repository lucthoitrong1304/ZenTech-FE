import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, effect, inject, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '@/shared/components/toast/toast.service';
import { AuthSessionStore } from '@/site-management/identity/data-access/store/auth-session.store';
import { CategoryNavigationStore } from '@/site-management/customer/shell/data-access/store/category-navigation.store';
import { SiteHeaderComponent } from '@/site-management/customer/shell/components/site-header/site-header.component';
import { CartItemRowComponent } from '@/site-management/customer/cart/components/cart-item-row/cart-item-row.component';
import { CartSummaryComponent } from '@/site-management/customer/cart/components/cart-summary/cart-summary.component';
import { CartStore } from '@/site-management/customer/cart/data-access/store/cart.store';

import { LucideArrowLeft, LucideShoppingCart } from '@lucide/angular';

@Component({
  selector: 'app-cart-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SiteHeaderComponent,
    CartItemRowComponent,
    CartSummaryComponent,
    LucideArrowLeft,
    LucideShoppingCart,
  ],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.css',
})
export class CartPageComponent {
  private readonly authSessionStore = inject(AuthSessionStore);
  private readonly categoryNavigationStore = inject(CategoryNavigationStore);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  protected readonly cartStore = inject(CartStore);

  protected readonly navItems = this.categoryNavigationStore.navItems;
  protected readonly currentUser = this.authSessionStore.currentUser;

  constructor() {
    effect(() => {
      if (!this.authSessionStore.isAuthenticated()) {
        untracked(() => this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/cart' } }));
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

  protected goToCheckout(): void {
    if (this.cartStore.isEmpty()) {
      return;
    }

    this.router.navigate(['/checkout']);
  }

  protected onLogout(): void {
    this.authSessionStore.logout();
  }
}
