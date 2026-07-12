import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthStorageService } from '@/core/services/auth-storage.service';
import { Role } from '@/site-management/identity/data-access/models/auth.enums';
import { hasRole } from '@/site-management/identity/data-access/utils/auth-role.utils';
import { CustomerChatPopupComponent } from '@/site-management/customer/chat/components/customer-chat-popup/customer-chat-popup.component';
import { CustomerChatStore } from '@/site-management/customer/chat/data-access/store/customer-chat.store';
import { CartStore } from '@/site-management/customer/cart/data-access/store/cart.store';
import { CategoryNavigationStore } from './data-access/store/category-navigation.store';

@Component({
  selector: 'app-customer-shell',
  standalone: true,
  imports: [RouterOutlet, CustomerChatPopupComponent],
  template: `
    <router-outlet />
    @if (showCustomerChat()) {
      <app-customer-chat-popup />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerShellComponent {
  private readonly router = inject(Router);
  private readonly authStorageService = inject(AuthStorageService);
  private readonly categoryNavigationStore = inject(CategoryNavigationStore);
  private readonly customerChatStore = inject(CustomerChatStore);
  private readonly cartStore = inject(CartStore);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly showCustomerChat = computed(() => {
    const url = this.currentUrl();

    return !this.isStaffSession() && url !== '/chat' && !url.startsWith('/error');
  });

  constructor() {
    this.categoryNavigationStore.loadCategoriesOnce();
    this.cartStore.loadForCurrentCustomer();

    // Ticket status belongs to the signed-in customer. Do not trigger a protected
    // API request while rendering the public storefront for anonymous visitors.
    if (
      this.authStorageService.getSession() &&
      this.authStorageService.isAuthenticated() &&
      !this.isStaffSession()
    ) {
      this.customerChatStore.loadCustomerTicketStatus();
    }
  }

  private isStaffSession(): boolean {
    const roles = this.authStorageService.getSession()?.roles ?? [];

    return (
      hasRole(roles, Role.OWNER) ||
      hasRole(roles, Role.MANAGER) ||
      hasRole(roles, Role.EMPLOYEE) ||
      hasRole(roles, Role.ADMIN)
    );
  }
}
