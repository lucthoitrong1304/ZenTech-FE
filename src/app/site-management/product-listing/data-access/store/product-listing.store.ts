import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import { ProductCategory } from '../models/product-category.model';
import { ProductListItem } from '../models/product-list-item.model';
import { ProductSortOptionValue } from '../models/product-sort-option.model';
import {
  PRODUCT_CATEGORY_NOT_FOUND,
  ProductCatalogService,
} from '../../../product-catalog/data-access/services/product-catalog.service';

interface ProductListingState {
  category: ProductCategory | null;
  products: ProductListItem[];
  sortBy: ProductSortOptionValue;
  loading: boolean;
  error: string | null;
  isInvalidCategory: boolean;
}

const INITIAL_STATE: ProductListingState = {
  category: null,
  products: [],
  sortBy: 'featured',
  loading: false,
  error: null,
  isInvalidCategory: false,
};

export const ProductListingStore = signalStore(
  withState<ProductListingState>(INITIAL_STATE),
  withComputed(({ products, sortBy }) => ({
    sortedProducts: computed(() => sortProducts(products(), sortBy())),
    isEmpty: computed(() => products().length === 0),
  })),
  withMethods((store, productCatalogService = inject(ProductCatalogService)) => ({
    loadCategory: rxMethod<string>(
      pipe(
        tap(() =>
          patchState(store, {
            category: null,
            products: [],
            loading: true,
            error: null,
            isInvalidCategory: false,
          })
        ),
        switchMap(slug =>
          productCatalogService.getCategoryListing(slug).pipe(
            tap({
              next: listing => {
                patchState(store, {
                  category: listing.category,
                  products: listing.products.map(product => ({ ...product })),
                  loading: false,
                  error: null,
                  isInvalidCategory: false,
                });
              },
              error: error => {
                const isInvalidCategory =
                  error instanceof Error && error.message === PRODUCT_CATEGORY_NOT_FOUND;

                patchState(store, {
                  category: null,
                  products: [],
                  loading: false,
                  error: isInvalidCategory
                    ? 'Danh muc nay hien chua ton tai trong catalog mock.'
                    : 'Khong the tai danh sach san pham luc nay.',
                  isInvalidCategory,
                });
              },
            }),
            catchError(() => EMPTY)
          )
        )
      )
    ),
    setSort(sortBy: ProductSortOptionValue): void {
      patchState(store, { sortBy });
    },
  }))
);

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
