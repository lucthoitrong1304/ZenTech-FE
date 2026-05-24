import { CommonModule } from '@angular/common';
import { Component, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
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

@Component({
  selector: 'app-product-listing-page',
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

  constructor() {
    effect(() => {
      const slug = this.categorySlug();
      const sortBy = this.productListingStore.sortBy();

      if (slug) {
        this.productListingStore.loadCategory({ slug, sortBy });
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

  onSortChange(sortBy: ProductSortOptionValue): void {
    this.productListingStore.setSort(sortBy);
  }

  onLoadMore(): void {
    this.productListingStore.loadMore();
  }

  onLogout(): void {
    this.authSessionStore.logout();
  }
}
