import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, computed, input, output, ViewChild, OnDestroy, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideChevronDown,
  LucideCircleUserRound,
  LucideLogIn,
  LucideLogOut,
  LucideMenu,
  LucideSearch,
  LucideSettings,
  LucideShoppingCart,
  LucideUserPlus,
  LucideMinus,
  LucidePlus,
  LucideTrash2,
  LucideX
} from '@lucide/angular';
import { PopoverModule } from 'primeng/popover';
import { DrawerModule } from 'primeng/drawer';
import { HeaderNavItem } from '@/site-management/customer/shell/models/site-navigation.models';
import { NotificationBellComponent } from '@/shared/components/notification-bell/notification-bell.component';
import { CartItem } from '@/site-management/customer/cart/data-access/models/cart.model';
import { ProductListItem } from '@/site-management/customer/catalog/data-access/models/product-catalog.models';

export interface HeaderUser {
  isAuthenticated: boolean;
  fullName?: string;
  avatarUrl?: string | null;
}

export interface HeaderNavigationIntent {
  commands: string[];
  queryParams?: Record<string, string>;
}

@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PopoverModule,
    DrawerModule,
    LucideMenu,
    LucideSearch,
    LucideShoppingCart,
    LucideCircleUserRound,
    LucideChevronDown,
    LucideLogIn,
    LucideUserPlus,
    LucideSettings,
    LucideLogOut,
    LucideMinus,
    LucidePlus,
    LucideTrash2,
    LucideX,
    NotificationBellComponent
  ],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.css'
})
export class SiteHeaderComponent implements OnDestroy {
  protected readonly searchVisible = signal(false);
  protected readonly searchQuery = signal('');

  protected readonly isHovered = signal(false);
  protected readonly isScrolled = signal(false);

  constructor() {
    if (typeof window !== 'undefined') {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      this.isScrolled.set(scrollY > 20);
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (typeof window !== 'undefined') {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      this.isScrolled.set(scrollY > 20);
    }
  }

  @ViewChild(NotificationBellComponent) bellComponent?: NotificationBellComponent;

  readonly transparent = input<boolean>(false);
  readonly navItems = input<HeaderNavItem[]>([]);
  readonly activeNavLabel = input<string | null>(null);
  readonly cartCount = input(0);
  readonly cartItems = input<readonly CartItem[]>([]);
  readonly cartTotal = input(0);
  readonly searchResults = input<readonly ProductListItem[]>([]);
  readonly searchLoading = input(false);
  readonly currentUser = input<HeaderUser | null>(null);

  readonly navSelect = output<HeaderNavItem>();
  readonly logout = output<void>();
  readonly navigationRequested = output<HeaderNavigationIntent>();
  readonly searchChanged = output<string>();
  readonly searchCleared = output<void>();
  readonly cartIncremented = output<string>();
  readonly cartDecremented = output<string>();
  readonly cartRemoved = output<string>();

  protected cartDrawerVisible = false;

  readonly isAuthenticated = computed(() => this.currentUser()?.isAuthenticated === true);
  readonly hasAvatar = computed(() => !!this.currentUser()?.avatarUrl);
  readonly shouldShowInitials = computed(() => this.isAuthenticated() && !this.hasAvatar());
  readonly accountInitials = computed(() => {
    const fullName = this.currentUser()?.fullName?.trim();

    if (!fullName) {
      return 'ZT';
    }

    return fullName
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  });

  readonly accountTriggerLabel = computed(() => {
    if (!this.isAuthenticated()) {
      return 'Tài khoản';
    }

    return this.currentUser()?.fullName || 'Quản lý tài khoản';
  });

  protected readonly cartIsEmpty = computed(() => this.cartItems().length === 0);
  protected readonly cartItemCount = computed(() => this.cartItems().length);

  isActive(item: HeaderNavItem): boolean {
    return this.activeNavLabel() === item.label;
  }

  onNavSelect(item: HeaderNavItem): void {
    this.navSelect.emit(item);
    this.navigationRequested.emit({ commands: [item.link] });
  }

  onLogout(): void {
    this.logout.emit();
  }

  toggleAccountMenu(event: MouseEvent, accountMenu: { toggle(event: Event, target?: EventTarget | null): void }, accountTrigger: EventTarget | null): void {
    if (this.bellComponent) {
      this.bellComponent.hide();
    }
    accountMenu.toggle(event, accountTrigger);
  }

  closeAndNavigate(commands: string[], queryParams?: Record<string, string>): void {
    this.cartDrawerVisible = false;
    setTimeout(() => {
      this.navigationRequested.emit({ commands, queryParams });
    }, 200);
  }

  navigateToLogin(): void {
    this.closeAndNavigate(['/auth/login']);
  }

  openSearch(): void {
    this.searchVisible.set(true);
    this.searchQuery.set('');
    this.searchCleared.emit();
    document.body.classList.add('p-overflow-hidden');
  }

  closeSearch(): void {
    this.searchVisible.set(false);
    document.body.classList.remove('p-overflow-hidden');
  }

  onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
    this.searchChanged.emit(query);
  }

  triggerSearch(): void {
    const query = this.searchQuery().trim();
    if (query) {
      this.closeSearch();
      this.navigationRequested.emit({ commands: ['/products'], queryParams: { search: query } });
    }
  }

  onInstantResultClick(productSlug: string): void {
    this.closeSearch();
    this.navigationRequested.emit({ commands: ['/products', productSlug] });
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.searchVisible()) {
      this.closeSearch();
    }
  }

  trackByLabel(_: number, item: HeaderNavItem): string {
    return item.slug;
  }

  ngOnDestroy(): void {
    const masks = document.querySelectorAll('.p-drawer-mask, .p-overlay-mask');
    masks.forEach(mask => {
      mask.remove();
    });
    document.body.classList.remove('p-overflow-hidden');
    document.documentElement.classList.remove('p-overflow-hidden');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  }
}
