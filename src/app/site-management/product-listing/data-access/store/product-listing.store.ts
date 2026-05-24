import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { addEntities, removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import { CartItemDraft } from '../../../cart/data-access/models/cart.model';
import { CartStore } from '../../../cart/data-access/store/cart.store';
import {
  ProductCategoryListing,
  ProductCategoryListingSort,
  ProductDetail,
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
  addingToCartProductId: string | null;
  cartSuccessMessage: string | null;
  cartErrorMessage: string | null;
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
  addingToCartProductId: null,
  cartSuccessMessage: null,
  cartErrorMessage: null,
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
    categoryNavigationStore = inject(CategoryNavigationStore),
    cartStore = inject(CartStore)
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
      addingToCartProductId: store.addingToCartProductId(),
      cartSuccessMessage: store.cartSuccessMessage(),
      cartErrorMessage: store.cartErrorMessage(),
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

        case ProductListingEventType.ProductAddToCartStarted:
          patchState(store, {
            addingToCartProductId: event.productId,
            cartSuccessMessage: null,
            cartErrorMessage: null,
          });
          break;

        case ProductListingEventType.ProductAddToCartSucceeded:
          patchState(store, {
            addingToCartProductId: null,
            cartSuccessMessage: `${event.productName} da duoc them vao gio hang.`,
            cartErrorMessage: null,
          });
          break;

        case ProductListingEventType.ProductAddToCartFailed:
          patchState(store, {
            addingToCartProductId: null,
            cartSuccessMessage: null,
            cartErrorMessage: event.error,
          });
          break;

        case ProductListingEventType.CartMessageCleared:
          patchState(store, {
            cartSuccessMessage: null,
            cartErrorMessage: null,
          });
          break;
      }
    };

    const loadCategory = rxMethod<{ slug: string; sortBy: ProductSortOptionValue }>(
      pipe(
        tap(({ slug }) => handleEvent({ type: ProductListingEventType.CategoryLoadStarted, slug })),
        switchMap(({ slug, sortBy }) =>
          categoryNavigationStore.resolveCategoryBySlug(slug).pipe(
            switchMap(category =>
              productCatalogService.getCategoryListing(category, {
                page: 0,
                size: store.size(),
                sort: toApiSort(sortBy),
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
      addProductToCart: rxMethod<ProductListItem>(
        pipe(
          tap(product =>
            handleEvent({
              type: ProductListingEventType.ProductAddToCartStarted,
              productId: product.id,
            })
          ),
          switchMap(product =>
            productCatalogService.getProductDetail(product.slug).pipe(
              tap({
                next: detail => {
                  const variant = detail.variants.find(item => item.stockQuantity > 0) ?? null;

                  if (!variant) {
                    handleEvent({
                      type: ProductListingEventType.ProductAddToCartFailed,
                      error: 'San pham nay hien khong con variant kha dung.',
                    });
                    return;
                  }

                  cartStore.addItem(toCartItemDraft(detail, variant.id, 1));
                  handleEvent({
                    type: ProductListingEventType.ProductAddToCartSucceeded,
                    productName: detail.name,
                  });
                },
                error: () =>
                  handleEvent({
                    type: ProductListingEventType.ProductAddToCartFailed,
                    error: 'Khong the them san pham vao gio hang luc nay.',
                  }),
              }),
              catchError(() => EMPTY)
            )
          )
        )
      ),
      setSort(sortBy: ProductSortOptionValue): void {
        handleEvent({ type: ProductListingEventType.SortChanged, sortBy });
      },
      clearCartMessages(): void {
        handleEvent({ type: ProductListingEventType.CartMessageCleared });
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

function toCartItemDraft(
  product: ProductDetail,
  variantId: string,
  quantity: number
): CartItemDraft {
  const variant = product.variants.find(item => item.id === variantId) ?? product.variants[0];
  const unitPrice = variant?.salePrice ?? variant?.originalPrice ?? product.price;

  return {
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    variantId: variant?.id ?? product.id,
    variantName: variant?.name ?? 'Default',
    image: product.image,
    unitPrice,
    originalPrice: variant?.salePrice ? variant.originalPrice : product.originalPrice,
    quantity,
    maxQuantity: variant?.stockQuantity ?? product.maxQuantity,
  };
}
