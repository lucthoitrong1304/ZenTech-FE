import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthSessionStore } from '@/site-management/identity/data-access/store/auth-session.store';
import { CartStore } from '@/site-management/customer/cart/data-access/store/cart.store';
import { CategoryNavigationStore } from '@/site-management/customer/shell/data-access/store/category-navigation.store';
import { CustomerShellStore } from '@/site-management/customer/shell/data-access/store/customer-shell.store';
import {
  HeaderNavigationIntent,
  SiteHeaderComponent,
} from './site-header.component';
import { HeaderNavItem } from '@/site-management/customer/shell/models/site-navigation.models';

@Component({
  selector: 'app-site-header-container',
  standalone: true,
  imports: [SiteHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-site-header
      [transparent]="transparent()"
      [navItems]="categoryNavigationStore.navItems()"
      [activeNavLabel]="activeNavLabel()"
      [cartCount]="cartStore.itemCount()"
      [cartItems]="cartStore.items()"
      [cartTotal]="cartStore.total()"
      [searchResults]="customerShellStore.instantResults()"
      [searchLoading]="customerShellStore.loadingResults()"
      [currentUser]="authSessionStore.currentUser()"
      (navSelect)="selectNavigation($event)"
      (logout)="authSessionStore.logout()"
      (navigationRequested)="navigate($event)"
      (searchChanged)="customerShellStore.searchProducts($event)"
      (searchCleared)="customerShellStore.clearSearch()"
      (cartIncremented)="cartStore.incrementItem($event)"
      (cartDecremented)="cartStore.decrementItem($event)"
      (cartRemoved)="cartStore.removeItem($event)"
    />
  `,
})
export class SiteHeaderContainerComponent {
  readonly transparent = input(false);
  protected readonly authSessionStore = inject(AuthSessionStore);
  protected readonly cartStore = inject(CartStore);
  protected readonly categoryNavigationStore = inject(CategoryNavigationStore);
  protected readonly customerShellStore = inject(CustomerShellStore);
  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  protected readonly activeNavLabel = computed(() => {
    const url = this.currentUrl();
    const items = this.categoryNavigationStore.navItems();

    for (const item of items) {
      if (item.link && url.startsWith(item.link)) {
        return item.label;
      }
      if (item.children) {
        for (const child of item.children) {
          if (child.link && url.startsWith(child.link)) {
            return item.label; // highlight parent category
          }
        }
      }
    }
    return null;
  });

  protected selectNavigation(item: HeaderNavItem): void {
    // Handled reactively by activeNavLabel computed signal
  }

  protected navigate(intent: HeaderNavigationIntent): void {
    this.router.navigate(intent.commands, { queryParams: intent.queryParams });
  }
}
