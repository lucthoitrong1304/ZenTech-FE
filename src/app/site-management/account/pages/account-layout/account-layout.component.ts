import { CommonModule } from '@angular/common';
import { Component, effect, inject, untracked } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideLayoutDashboard,
  LucideMapPin,
  LucideReceiptText,
  LucideTicket,
} from '@lucide/angular';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { CartStore } from '../../../cart/data-access/store/cart.store';
import { CategoryNavigationStore } from '../../../shared/data-access/store/category-navigation.store';
import { SiteHeaderComponent } from '../../../shared/site-header/site-header.component';

interface AccountNavItem {
  label: string;
  link: string;
  icon: 'overview' | 'orders' | 'addresses' | 'vouchers';
}

@Component({
  selector: 'app-account-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    SiteHeaderComponent,
    LucideLayoutDashboard,
    LucideReceiptText,
    LucideMapPin,
    LucideTicket,
  ],
  templateUrl: './account-layout.component.html',
  styleUrl: './account-layout.component.css',
})
export class AccountLayoutComponent {
  private readonly authSessionStore = inject(AuthSessionStore);
  private readonly categoryNavigationStore = inject(CategoryNavigationStore);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  protected readonly cartStore = inject(CartStore);

  protected readonly currentUser = this.authSessionStore.currentUser;
  protected readonly navItems = this.categoryNavigationStore.navItems;
  protected readonly accountNavItems: AccountNavItem[] = [
    { label: 'Tong quan', link: '/account/overview', icon: 'overview' },
    { label: 'Lich su don hang', link: '/account/orders', icon: 'orders' },
    { label: 'So dia chi', link: '/account/addresses', icon: 'addresses' },
    { label: 'Kho voucher', link: '/account/vouchers', icon: 'vouchers' },
  ];

  constructor() {
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

  protected onLogout(): void {
    this.authSessionStore.logout();
  }
}
