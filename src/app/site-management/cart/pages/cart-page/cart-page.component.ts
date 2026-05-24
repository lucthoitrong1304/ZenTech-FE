import { CommonModule } from '@angular/common';
import { Component, effect, inject, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { CategoryNavigationStore } from '../../../shared/data-access/store/category-navigation.store';
import { SiteHeaderComponent } from '../../../shared/site-header/site-header.component';
import { CartItemRowComponent } from '../../components/cart-item-row/cart-item-row.component';
import { CartSummaryComponent } from '../../components/cart-summary/cart-summary.component';
import { CartStore } from '../../data-access/store/cart.store';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SiteHeaderComponent,
    CartItemRowComponent,
    CartSummaryComponent,
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

  protected onCheckout(): void {
    this.toastService.warning('Checkout se duoc ket noi trong phase tiep theo.');
  }

  protected onLogout(): void {
    this.authSessionStore.logout();
  }
}
