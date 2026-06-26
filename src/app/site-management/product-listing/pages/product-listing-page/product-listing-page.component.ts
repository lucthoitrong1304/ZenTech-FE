import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, effect, inject, untracked, HostListener } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { CartStore } from '../../../cart/data-access/store/cart.store';
import { ProductListItem } from '../../../product-catalog/data-access/models/product-catalog.models';
import { CategoryNavigationStore } from '../../../shared/data-access/store/category-navigation.store';
import { SiteHeaderComponent } from '../../../shared/site-header/site-header.component';
import {
  PRODUCT_SORT_OPTIONS,
  ProductSortOptionValue,
} from '../../data-access/models/product-sort-option.model';
import { ProductListingStore } from '../../data-access/store/product-listing.store';
import { ProductEmptyStateComponent } from '../../components/product-empty-state/product-empty-state.component';
import { ProductGridComponent } from '../../components/product-grid/product-grid.component';
import { ProductListingHeroComponent } from '../../components/product-listing-hero/product-listing-hero.component';
import { ProductListingToolbarComponent } from '../../components/product-listing-toolbar/product-listing-toolbar.component';
import { setupLogoutMessageEffects } from '../../../auth/data-access/utils/logout-message-effects.util';

@Component({
  selector: 'app-product-listing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    SiteHeaderComponent,
    ProductEmptyStateComponent,
    ProductGridComponent,
    ProductListingHeroComponent,
    ProductListingToolbarComponent,
  ],
  templateUrl: './product-listing-page.component.html',
  styleUrl: './product-listing-page.component.css',
  providers: [ProductListingStore],
})
export class ProductListingPageComponent {
  private readonly authSessionStore = inject(AuthSessionStore);
  private readonly categoryNavigationStore = inject(CategoryNavigationStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  protected readonly cartStore = inject(CartStore);
  protected readonly productListingStore = inject(ProductListingStore);

  readonly navItems = this.categoryNavigationStore.navItems;
  readonly sortOptions = PRODUCT_SORT_OPTIONS;
  readonly currentUser = this.authSessionStore.currentUser;
  readonly skeletonCards = Array.from({ length: 6 }, (_, index) => index);
  private readonly categorySlug = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('slug')?.trim() ?? ''),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );
  private readonly searchQuery = toSignal(
    this.route.queryParamMap.pipe(
      map(params => params.get('search')?.trim() ?? ''),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  protected searchSortDropdownOpen = false;

  constructor() {
    effect(() => {
      const slug = this.categorySlug();
      const query = this.searchQuery();

      untracked(() => {
        if (slug) {
          this.productListingStore.loadCategory({
            slug,
            sortBy: this.productListingStore.sortBy(),
          });
        } else {
          this.productListingStore.searchProducts({
            query,
            sortBy: this.productListingStore.sortBy(),
          });
        }
      });
    });

    setupLogoutMessageEffects(this.authSessionStore, this.toastService, this.router);

    effect(() => {
      const message = this.productListingStore.cartSuccessMessage();

      if (message) {
        untracked(() => {
          this.toastService.success(message);
          this.productListingStore.clearCartMessages();
        });
      }
    });

    effect(() => {
      const message = this.productListingStore.cartErrorMessage();

      if (message) {
        untracked(() => {
          this.toastService.warning(message);
          this.productListingStore.clearCartMessages();
        });
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('#searchSortToolbar') && this.searchSortDropdownOpen) {
      this.searchSortDropdownOpen = false;
    }
  }

  getSortLabel(value: ProductSortOptionValue): string {
    const current = this.sortOptions.find(opt => opt.value === value);
    return current ? current.label : '';
  }

  onSortChange(sortBy: ProductSortOptionValue): void {
    this.productListingStore.changeSort(sortBy);
  }

  onLoadMore(): void {
    this.productListingStore.loadMore();
  }

  onAddToCart(product: ProductListItem): void {
    if (!this.authSessionStore.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.productListingStore.addProductToCart(product);
  }

  onLogout(): void {
    this.authSessionStore.logout();
  }
}
