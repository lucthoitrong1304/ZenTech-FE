import { CommonModule } from '@angular/common';
import { Component, computed, input, output, ViewChild, inject, OnDestroy, HostListener, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, takeUntil } from 'rxjs/operators';
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
import { HeaderNavItem } from '../site-navigation.models';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';
import { CartStore } from '../../cart/data-access/store/cart.store';
import { ProductCatalogService } from '../../product-catalog/data-access/services/product-catalog.service';
import { ProductListItem } from '../../product-catalog/data-access/models/product-catalog.models';

export interface HeaderUser {
  isAuthenticated: boolean;
  fullName?: string;
  avatarUrl?: string | null;
}

@Component({
  selector: 'app-site-header',
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
  private readonly router = inject(Router);
  protected readonly cartStore = inject(CartStore);
  private readonly productCatalogService = inject(ProductCatalogService);
  private readonly searchSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  protected readonly searchVisible = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly instantResults = signal<ProductListItem[]>([]);
  protected readonly loadingResults = signal(false);

  constructor() {
    this.searchSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query.trim()) {
          this.instantResults.set([]);
          this.loadingResults.set(false);
          return of(null);
        }
        this.loadingResults.set(true);
        return this.productCatalogService.getProducts({ search: query, size: 5 }).pipe(
          catchError(() => {
            this.loadingResults.set(false);
            return of(null);
          })
        );
      })
    ).subscribe(response => {
      this.loadingResults.set(false);
      if (response) {
        this.instantResults.set(response.items);
      }
    });
  }

  @ViewChild(NotificationBellComponent) bellComponent?: NotificationBellComponent;

  readonly navItems = input<HeaderNavItem[]>([]);
  readonly activeNavLabel = input<string | null>(null);
  readonly cartCount = input(0);
  readonly currentUser = input<HeaderUser | null>(null);
  readonly navSelect = output<HeaderNavItem>();
  readonly logout = output<void>();

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

  isActive(item: HeaderNavItem): boolean {
    return this.activeNavLabel() === item.label;
  }

  onNavSelect(item: HeaderNavItem): void {
    this.navSelect.emit(item);
  }

  onLogout(): void {
    this.logout.emit();
  }

  toggleAccountMenu(event: MouseEvent, accountMenu: any, accountTrigger: any): void {
    if (this.bellComponent) {
      this.bellComponent.hide();
    }
    accountMenu.toggle(event, accountTrigger);
  }

  closeAndNavigate(commands: any[], queryParams?: any): void {
    this.cartDrawerVisible = false;
    setTimeout(() => {
      this.router.navigate(commands, { queryParams });
    }, 200);
  }

  navigateToLogin(): void {
    this.closeAndNavigate(['/auth/login'], { returnUrl: this.router.url });
  }

  trackByLabel(_: number, item: HeaderNavItem): string {
    return item.slug;
  }

  openSearch(): void {
    this.searchVisible.set(true);
    this.searchQuery.set('');
    this.instantResults.set([]);
    this.loadingResults.set(false);
    document.body.classList.add('p-overflow-hidden');
  }

  closeSearch(): void {
    this.searchVisible.set(false);
    document.body.classList.remove('p-overflow-hidden');
  }

  onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }

  triggerSearch(): void {
    const query = this.searchQuery().trim();
    if (query) {
      this.closeSearch();
      this.router.navigate(['/products'], { queryParams: { search: query } });
    }
  }

  onInstantResultClick(productSlug: string): void {
    this.closeSearch();
    this.router.navigate(['/products', productSlug]);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.searchVisible()) {
      this.closeSearch();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up PrimeNG drawer mask if it's left in the DOM on navigation
    const masks = document.querySelectorAll('.p-drawer-mask, .p-overlay-mask');
    masks.forEach(mask => {
      mask.remove();
    });
    // Restore body scroll and styles
    document.body.classList.remove('p-overflow-hidden');
    document.documentElement.classList.remove('p-overflow-hidden');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  }
}
