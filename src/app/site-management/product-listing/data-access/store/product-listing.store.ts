import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { addEntities, removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import {
  ProductCategoryListing,
  ProductCategoryListingSort,
} from '../../../product-catalog/data-access/models/product-catalog.models';
import {
  PRODUCT_CATEGORY_NOT_FOUND,
  ProductCatalogService,
} from '../../../product-catalog/data-access/services/product-catalog.service';
import { CategoryNavigationStore } from '../../../shared/data-access/store/category-navigation.store';
import { ProductCategory } from '../models/product-category.model';
import { ProductListingEvent, ProductListingEventType } from '../models/product-listing.event';
import { ProductListItem } from '../models/product-list-item.model';
import { ProductSortOptionValue } from '../models/product-sort-option.model';

interface ProductListingUiState {
  categorySlug: string | null;
  category: ProductCategory | null;
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

const PRODUCT_ENTITY_CONFIG = {
  collection: 'product',
  selectId: (product: ProductListItem) => product.id,
} as const;

const INITIAL_STATE: ProductListingUiState = {
  categorySlug: null,
  category: null,
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
  withState<ProductListingUiState>(INITIAL_STATE),
  withEntities<ProductListItem, 'product'>({
    entity: {} as ProductListItem,
    collection: 'product',
  }),
  withComputed(({ productEntities }) => ({
    products: computed(() => productEntities()),
    sortedProducts: computed(() => productEntities()),
    isEmpty: computed(() => productEntities().length === 0),
  })),
  withMethods((
    store,
    productCatalogService = inject(ProductCatalogService),
    categoryNavigationStore = inject(CategoryNavigationStore)
  ) => {
    const applyListingMetadata = (listing: ProductCategoryListing): ProductListingUiState => ({
      categorySlug: store.categorySlug(),
      category: listing.category,
      sortBy: store.sortBy(),
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

    const handleEvent = (event: ProductListingEvent): void => {
      switch (event.type) {
        case ProductListingEventType.CategoryLoadStarted:
          patchState(
            store,
            removeAllEntities(PRODUCT_ENTITY_CONFIG),
            {
              categorySlug: event.slug,
              category: null,
              page: 0,
              totalItems: 0,
              totalPages: 0,
              hasNext: false,
              hasPrevious: false,
              loading: true,
              loadingMore: false,
              error: null,
              isInvalidCategory: false,
            }
          );
          break;

        case ProductListingEventType.CategoryLoadSucceeded:
          patchState(
            store,
            setAllEntities(
              event.listing.products.map(product => ({ ...product })),
              PRODUCT_ENTITY_CONFIG
            ),
            applyListingMetadata(event.listing)
          );
          break;

        case ProductListingEventType.CategoryLoadFailed:
          patchState(
            store,
            removeAllEntities(PRODUCT_ENTITY_CONFIG),
            {
              category: null,
              page: 0,
              totalItems: 0,
              totalPages: 0,
              hasNext: false,
              hasPrevious: false,
              loading: false,
              loadingMore: false,
              error: event.isInvalidCategory
                ? 'Danh muc nay khong ton tai.'
                : 'Khong the tai danh sach san pham luc nay.',
              isInvalidCategory: event.isInvalidCategory,
            }
          );
          break;

        case ProductListingEventType.MoreProductsLoadStarted:
          patchState(store, { loadingMore: true, error: null });
          break;

        case ProductListingEventType.MoreProductsLoadSucceeded:
          patchState(
            store,
            addEntities(
              event.listing.products.map(product => ({ ...product })),
              PRODUCT_ENTITY_CONFIG
            ),
            applyListingMetadata(event.listing)
          );
          break;

        case ProductListingEventType.MoreProductsLoadFailed:
          patchState(store, {
            loadingMore: false,
            error: 'Khong the tai them san pham luc nay.',
          });
          break;

        case ProductListingEventType.SortChanged:
          patchState(store, { sortBy: event.sortBy });
          break;
      }
    };

    const loadCategory = rxMethod<string>(
      pipe(
        tap(slug => handleEvent({ type: ProductListingEventType.CategoryLoadStarted, slug })),
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
              next: listing =>
                handleEvent({ type: ProductListingEventType.CategoryLoadSucceeded, listing }),
              error: error => {
                const isInvalidCategory =
                  error instanceof Error && error.message === PRODUCT_CATEGORY_NOT_FOUND;

                handleEvent({
                  type: ProductListingEventType.CategoryLoadFailed,
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

          handleEvent({ type: ProductListingEventType.MoreProductsLoadStarted });

          return productCatalogService
            .getCategoryListing(category, {
              page: store.page() + 1,
              size: store.size(),
              sort: toApiSort(store.sortBy()),
            })
            .pipe(
              tap({
                next: listing =>
                  handleEvent({
                    type: ProductListingEventType.MoreProductsLoadSucceeded,
                    listing,
                  }),
                error: () =>
                  handleEvent({ type: ProductListingEventType.MoreProductsLoadFailed }),
              }),
              catchError(() => EMPTY)
            );
        })
      )
    );

    return {
      dispatch: handleEvent,
      loadCategory,
      loadMore,
      setSort(sortBy: ProductSortOptionValue): void {
        handleEvent({ type: ProductListingEventType.SortChanged, sortBy });

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
