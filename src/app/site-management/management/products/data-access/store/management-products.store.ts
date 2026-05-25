import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeEntity, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, forkJoin, map, pipe, switchMap, tap } from 'rxjs';
import { ManagementProductEvent, ManagementProductEventType } from '../models/management-product.event';
import {
  ManagementProduct,
  ManagementProductCategory,
  ManagementProductPage,
  ManagementProductQuery,
  ManagementProductStats,
} from '../models/management-product.models';
import { ManagementProductMockService } from '../services/management-product-mock.service';

const DEFAULT_QUERY: ManagementProductQuery = {
  page: 0,
  size: 4,
  sort: 'name,asc',
  keyword: '',
  categoryId: 'all',
  stockStatus: 'all',
};

const PRODUCT_ENTITY_CONFIG = {
  collection: 'product',
  selectId: (product: ManagementProduct) => product.productId,
} as const;

interface ManagementProductsUiState {
  query: ManagementProductQuery;
  totalElements: number;
  totalPages: number;
  last: boolean;
  loading: boolean;
  categories: ManagementProductCategory[];
  stats: ManagementProductStats;
  successMessage: string | null;
  errorMessage: string | null;
}

const INITIAL_STATE: ManagementProductsUiState = {
  query: DEFAULT_QUERY,
  totalElements: 0,
  totalPages: 0,
  last: true,
  loading: false,
  categories: [],
  stats: {
    totalProducts: 0,
    outOfStock: 0,
    inventoryValue: 0,
    lowStock: 0,
  },
  successMessage: null,
  errorMessage: null,
};

export const ManagementProductsStore = signalStore(
  withState<ManagementProductsUiState>(INITIAL_STATE),
  withEntities<ManagementProduct, 'product'>({
    entity: {} as ManagementProduct,
    collection: 'product',
  }),
  withComputed(({ productEntities, query, totalElements, totalPages }) => ({
    products: computed(() => productEntities()),
    hasProducts: computed(() => productEntities().length > 0),
    isEmpty: computed(() => productEntities().length === 0),
    pageStart: computed(() => (totalElements() === 0 ? 0 : query().page * query().size + 1)),
    pageEnd: computed(() => Math.min((query().page + 1) * query().size, totalElements())),
    canGoPrevious: computed(() => query().page > 0),
    canGoNext: computed(() => query().page + 1 < totalPages()),
    activeFilterCount: computed(() => {
      let count = 0;

      if (query().keyword.trim()) {
        count += 1;
      }

      if (query().categoryId !== 'all') {
        count += 1;
      }

      if (query().stockStatus !== 'all') {
        count += 1;
      }

      return count;
    }),
  })),
  withMethods((store, productService = inject(ManagementProductMockService)) => {
    const applyProductsPage = (page: ManagementProductPage): void => {
      patchState(
        store,
        setAllEntities(page.products, PRODUCT_ENTITY_CONFIG),
        {
          query: {
            ...store.query(),
            page: page.page,
            size: page.size,
          },
          totalElements: page.totalElements,
          totalPages: page.totalPages,
          last: page.last,
          loading: false,
          errorMessage: null,
        }
      );
    };

    const handleEvent = (event: ManagementProductEvent): void => {
      switch (event.type) {
        case ManagementProductEventType.ProductsLoadStarted:
          patchState(store, { loading: true, errorMessage: null });
          break;

        case ManagementProductEventType.ProductsLoadSucceeded:
          applyProductsPage(event.page);
          break;

        case ManagementProductEventType.ProductsLoadFailed:
          patchState(store, {
            loading: false,
            totalElements: 0,
            totalPages: 0,
            last: true,
            errorMessage: 'Khong the tai danh sach san pham. Vui long thu lai.',
          });
          break;

        case ManagementProductEventType.StatsLoadSucceeded:
          patchState(store, { stats: event.stats });
          break;

        case ManagementProductEventType.SearchKeywordChanged:
          patchState(store, {
            query: {
              ...store.query(),
              keyword: event.keyword,
              page: 0,
            },
          });
          break;

        case ManagementProductEventType.CategoryFilterChanged:
          patchState(store, {
            query: {
              ...store.query(),
              categoryId: event.categoryId,
              page: 0,
            },
          });
          break;

        case ManagementProductEventType.StockFilterChanged:
          patchState(store, {
            query: {
              ...store.query(),
              stockStatus: event.stockStatus,
              page: 0,
            },
          });
          break;

        case ManagementProductEventType.SortChanged:
          patchState(store, {
            query: {
              ...store.query(),
              sort: event.sort,
              page: 0,
            },
          });
          break;

        case ManagementProductEventType.FiltersApplied:
          patchState(store, { query: { ...store.query(), page: 0 } });
          break;

        case ManagementProductEventType.FiltersReset:
          patchState(store, { query: { ...event.query } });
          break;

        case ManagementProductEventType.PageChanged:
          patchState(store, {
            query: {
              ...store.query(),
              page: Math.max(0, Math.min(event.page, Math.max(store.totalPages() - 1, 0))),
            },
          });
          break;

        case ManagementProductEventType.ProductDeleted:
          patchState(
            store,
            removeEntity(event.productId, PRODUCT_ENTITY_CONFIG),
            {
              totalElements: Math.max(0, store.totalElements() - 1),
              successMessage: 'Da xoa san pham mock khoi danh sach.',
            }
          );
          break;

        case ManagementProductEventType.ProductDeleteFailed:
          patchState(store, { errorMessage: 'Khong the xoa san pham luc nay.' });
          break;

        case ManagementProductEventType.MessagesCleared:
          patchState(store, { successMessage: null, errorMessage: null });
          break;
      }
    };

    const loadProducts = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: ManagementProductEventType.ProductsLoadStarted })),
        switchMap(() =>
          forkJoin({
            page: productService.getProducts(store.query()),
            stats: productService.getProductStats(),
            categories: productService.getCategories(),
          }).pipe(
            tap({
              next: ({ page, stats, categories }) => {
                patchState(store, { categories });
                handleEvent({ type: ManagementProductEventType.StatsLoadSucceeded, stats });
                handleEvent({ type: ManagementProductEventType.ProductsLoadSucceeded, page });
              },
              error: () => handleEvent({ type: ManagementProductEventType.ProductsLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const deleteProduct = rxMethod<string>(
      pipe(
        switchMap(productId =>
          productService.deleteProduct(productId).pipe(
            tap({
              next: deletedProductId =>
                handleEvent({
                  type: ManagementProductEventType.ProductDeleted,
                  productId: deletedProductId,
                }),
              error: () => handleEvent({ type: ManagementProductEventType.ProductDeleteFailed }),
            }),
            switchMap(() => productService.getProductStats()),
            tap(stats => handleEvent({ type: ManagementProductEventType.StatsLoadSucceeded, stats })),
            map(() => undefined),
            catchError(() => EMPTY)
          )
        )
      )
    );

    return {
      dispatch: handleEvent,
      loadProducts,
      deleteProduct,
      setKeyword(keyword: string): void {
        handleEvent({ type: ManagementProductEventType.SearchKeywordChanged, keyword });
      },
      setCategoryFilter(categoryId: string): void {
        handleEvent({ type: ManagementProductEventType.CategoryFilterChanged, categoryId });
      },
      setStockFilter(stockStatus: ManagementProductQuery['stockStatus']): void {
        handleEvent({ type: ManagementProductEventType.StockFilterChanged, stockStatus });
      },
      setSort(sort: ManagementProductQuery['sort']): void {
        handleEvent({ type: ManagementProductEventType.SortChanged, sort });
      },
      applyFilters(): void {
        handleEvent({ type: ManagementProductEventType.FiltersApplied });
        loadProducts();
      },
      resetFilters(): void {
        handleEvent({ type: ManagementProductEventType.FiltersReset, query: DEFAULT_QUERY });
        loadProducts();
      },
      goToPage(page: number): void {
        handleEvent({ type: ManagementProductEventType.PageChanged, page });
        loadProducts();
      },
      clearMessages(): void {
        handleEvent({ type: ManagementProductEventType.MessagesCleared });
      },
    };
  })
);
