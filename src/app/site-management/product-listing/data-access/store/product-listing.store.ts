import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import { ProductCategory } from '../models/product-category.model';
import { ProductListItem } from '../models/product-list-item.model';
import { ProductSortOptionValue } from '../models/product-sort-option.model';
import { ProductCategoryListingSort } from '../../../product-catalog/data-access/models/product-catalog.models';
import {
  PRODUCT_CATEGORY_NOT_FOUND,
  ProductCatalogService,
} from '../../../product-catalog/data-access/services/product-catalog.service';
import { CategoryNavigationStore } from '../../../shared/data-access/store/category-navigation.store';

interface ProductListingState {
  categorySlug: string | null;
  category: ProductCategory | null;
  products: ProductListItem[];
  sortBy: ProductSortOptionValue;
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  isInvalidCategory: boolean;
}

const INITIAL_STATE: ProductListingState = {
  categorySlug: null,
  category: null,
  products: [],
  sortBy: 'featured',
  page: 0,
  size: 10,
  totalItems: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
  loading: false,
  loadingMore: false,
  error: null,
  isInvalidCategory: false,
};

export const ProductListingStore = signalStore(
  withState<ProductListingState>(INITIAL_STATE),
  withComputed(({ products }) => ({
    sortedProducts: computed(() => products()),
    isEmpty: computed(() => products().length === 0),
  })),
  withMethods((
    store,
    productCatalogService = inject(ProductCatalogService),
    categoryNavigationStore = inject(CategoryNavigationStore)
  ) => {
    const loadCategory = rxMethod<string>(
      pipe(
        tap(slug =>
          patchState(store, {
            categorySlug: slug,
            category: null,
            products: [],
            page: 0,
            totalItems: 0,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false,
            loading: true,
            loadingMore: false,
            error: null,
            isInvalidCategory: false,
          })
        ),
        switchMap(slug =>
          categoryNavigationStore.resolveCategoryBySlug(slug).pipe(
            switchMap(category =>
              productCatalogService.getCategoryListing(category, {
                page: 0,
                size: store.size(),
                sort: toApiSort(store.sortBy()),
              })
            ),
            tap({
              next: listing => {
                patchState(store, {
                  category: listing.category,
                  products: listing.products.map(product => ({ ...product })),
                  page: listing.page,
                  size: listing.size,
                  totalItems: listing.totalItems,
                  totalPages: listing.totalPages,
                  hasNext: listing.hasNext,
                  hasPrevious: listing.hasPrevious,
                  loading: false,
                  loadingMore: false,
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
                  page: 0,
                  totalItems: 0,
                  totalPages: 0,
                  hasNext: false,
                  hasPrevious: false,
                  loading: false,
                  loadingMore: false,
                  error: isInvalidCategory
                    ? 'Danh muc nay khong ton tai.'
                    : 'Khong the tai danh sach san pham luc nay.',
                  isInvalidCategory,
                });
              },
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadMore = rxMethod<void>(
      pipe(
        switchMap(() => {
          const slug = store.categorySlug();
          const category = slug ? categoryNavigationStore.findCategoryBySlug(slug) : null;

          if (!category || store.loading() || store.loadingMore() || !store.hasNext()) {
            return EMPTY;
          }

          const nextPage = store.page() + 1;
          patchState(store, { loadingMore: true, error: null });

          return productCatalogService
            .getCategoryListing(category, {
              page: nextPage,
              size: store.size(),
              sort: toApiSort(store.sortBy()),
            })
            .pipe(
              tap({
                next: listing => {
                  patchState(store, {
                    category: listing.category,
                    products: [
                      ...store.products(),
                      ...listing.products.map(product => ({ ...product })),
                    ],
                    page: listing.page,
                    size: listing.size,
                    totalItems: listing.totalItems,
                    totalPages: listing.totalPages,
                    hasNext: listing.hasNext,
                    hasPrevious: listing.hasPrevious,
                    loading: false,
                    loadingMore: false,
                    error: null,
                    isInvalidCategory: false,
                  });
                },
                error: () => {
                  patchState(store, {
                    loadingMore: false,
                    error: 'Khong the tai them san pham luc nay.',
                  });
                },
              }),
              catchError(() => EMPTY)
            );
        })
      )
    );

    return {
      loadCategory,
      loadMore,
      setSort(sortBy: ProductSortOptionValue): void {
        patchState(store, { sortBy });

        const slug = store.categorySlug();

        if (slug) {
          loadCategory(slug);
        }
      },
    };
  })
);

function toApiSort(sortBy: ProductSortOptionValue): ProductCategoryListingSort {
  switch (sortBy) {
    case 'price-asc':
      return 'PRICE_ASC';
    case 'price-desc':
      return 'PRICE_DESC';
    case 'featured':
    default:
      return 'NEWEST';
  }
}
