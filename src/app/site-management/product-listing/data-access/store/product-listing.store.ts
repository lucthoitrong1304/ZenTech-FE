import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { EMPTY, catchError, switchMap, tap } from 'rxjs';
import { ProductCategoryListing } from '../models/product-category.model';
import { ProductListItem } from '../models/product-list-item.model';
import { ProductListingViewModel } from '../models/product-listing-view.model';
import { ProductSortOptionValue } from '../models/product-sort-option.model';
import {
  PRODUCT_CATEGORY_NOT_FOUND,
  ProductCatalogService,
} from '../../../product-catalog/data-access/services/product-catalog.service';

interface ProductListingState extends ProductListingViewModel {}

const INITIAL_STATE: ProductListingState = {
  category: null,
  products: [],
  sortedProducts: [],
  sortBy: 'featured',
  loading: false,
  error: null,
  isEmpty: false,
  isInvalidCategory: false,
};

@Injectable()
export class ProductListingStore extends ComponentStore<ProductListingState> {
  private readonly productCatalogService = inject(ProductCatalogService);

  readonly vm$ = this.select(state => state);

  readonly loadCategory = this.effect<string>(slug$ =>
    slug$.pipe(
      tap(() =>
        this.patchState({
          category: null,
          products: [],
          sortedProducts: [],
          loading: true,
          error: null,
          isEmpty: false,
          isInvalidCategory: false,
        })
      ),
      switchMap(slug =>
        this.productCatalogService.getCategoryListing(slug).pipe(
          tap({
            next: listing => this.setListing(listing),
            error: error => this.handleListingError(error),
          }),
          catchError(() => EMPTY)
        )
      )
    )
  );

  readonly setSort = this.updater((state, sortBy: ProductSortOptionValue): ProductListingState => ({
    ...state,
    sortBy,
    sortedProducts: sortProducts(state.products, sortBy),
  }));

  constructor() {
    super(INITIAL_STATE);
  }

  private setListing(listing: ProductCategoryListing): void {
    const currentSort = this.get().sortBy;
    const products = listing.products.map(product => ({ ...product }));

    this.patchState({
      category: listing.category,
      products,
      sortedProducts: sortProducts(products, currentSort),
      loading: false,
      error: null,
      isEmpty: products.length === 0,
      isInvalidCategory: false,
    });
  }

  private handleListingError(error: unknown): void {
    const isInvalidCategory =
      error instanceof Error && error.message === PRODUCT_CATEGORY_NOT_FOUND;

    this.patchState({
      category: null,
      products: [],
      sortedProducts: [],
      loading: false,
      error: isInvalidCategory
        ? 'Danh mục này hiện chưa tồn tại trong catalog mock.'
        : 'Không thể tải danh sách sản phẩm lúc này.',
      isEmpty: false,
      isInvalidCategory,
    });
  }
}

function sortProducts(
  products: ProductListItem[],
  sortBy: ProductSortOptionValue
): ProductListItem[] {
  const nextProducts = [...products];

  switch (sortBy) {
    case 'price-asc':
      return nextProducts.sort((left, right) => left.price - right.price);
    case 'price-desc':
      return nextProducts.sort((left, right) => right.price - left.price);
    case 'name-asc':
      return nextProducts.sort((left, right) => left.name.localeCompare(right.name));
    case 'featured':
    default:
      return nextProducts;
  }
}
