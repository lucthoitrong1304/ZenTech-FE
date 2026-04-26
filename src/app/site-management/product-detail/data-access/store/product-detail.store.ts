import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import {
  PRODUCT_NOT_FOUND,
  ProductCatalogService,
} from '../../../product-catalog/data-access/services/product-catalog.service';
import {
  ProductDetail,
  ProductReview,
} from '../../../product-catalog/data-access/models/product-catalog.models';
import {
  ProductDetailViewModel,
  ProductReviewDraft,
  ProductReviewFormError,
} from '../models/product-detail-view.model';

const EMPTY_REVIEW_DRAFT: ProductReviewDraft = {
  reviewerName: '',
  rating: 0,
  title: '',
  comment: '',
};

const INITIAL_STATE: ProductDetailViewModel = {
  product: null,
  relatedProducts: [],
  loading: false,
  error: null,
  isNotFound: false,
  reviewModalOpen: false,
  reviewSubmitting: false,
  reviewFormError: null,
  reviewDraft: EMPTY_REVIEW_DRAFT,
  reviewSuccessMessage: null,
  quantity: 1,
};

export const ProductDetailStore = signalStore(
  withState<ProductDetailViewModel>(INITIAL_STATE),
  withComputed(({ product, quantity }) => ({
    canIncrement: computed(() => {
      const currentProduct = product();

      return !!currentProduct?.inStock && quantity() < currentProduct.maxQuantity;
    }),
    canDecrement: computed(() => !!product()?.inStock && quantity() > 1),
    reviewCount: computed(() => product()?.reviewCount ?? 0),
    rating: computed(() => product()?.rating ?? 0),
  })),
  withMethods((store, productCatalogService = inject(ProductCatalogService)) => {
    const resetForLoad = (): void => {
      patchState(store, {
        product: null,
        relatedProducts: [],
        loading: true,
        error: null,
        isNotFound: false,
        reviewModalOpen: false,
        reviewSubmitting: false,
        reviewFormError: null,
        reviewDraft: { ...EMPTY_REVIEW_DRAFT },
        reviewSuccessMessage: null,
        quantity: 1,
      });
    };

    const addReview = (review: ProductReview): void => {
      const product = store.product();

      if (!product) {
        return;
      }

      const reviews = [review, ...product.reviews];
      const rating = Number(
        (reviews.reduce((total, item) => total + item.rating, 0) / reviews.length).toFixed(1)
      );

      patchState(store, {
        product: {
          ...product,
          rating,
          reviewCount: reviews.length,
          reviews,
        },
        reviewModalOpen: false,
        reviewSubmitting: false,
        reviewFormError: null,
        reviewDraft: { ...EMPTY_REVIEW_DRAFT },
        reviewSuccessMessage: 'Danh gia cua ban da duoc them vao san pham.',
      });
    };

    return {
      loadProduct: rxMethod<string>(
        pipe(
          tap(() => resetForLoad()),
          switchMap(slug =>
            productCatalogService.getProductDetail(slug).pipe(
              tap({
                next: product => {
                  patchState(store, {
                    product,
                    relatedProducts: productCatalogService.getRelatedProducts(
                      product.relatedProductSlugs
                    ),
                    loading: false,
                    error: null,
                    isNotFound: false,
                    quantity: product.inStock ? 1 : 0,
                  });
                },
                error: error => {
                  const isNotFound = error instanceof Error && error.message === PRODUCT_NOT_FOUND;

                  patchState(store, {
                    product: null,
                    relatedProducts: [],
                    loading: false,
                    error: isNotFound
                      ? 'San pham nay hien chua ton tai trong catalog mock.'
                      : 'Khong the tai thong tin san pham luc nay.',
                    isNotFound,
                  });
                },
              }),
              catchError(() => EMPTY)
            )
          )
        )
      ),
      submitReview: rxMethod<void>(
        pipe(
          switchMap(() => {
            const product = store.product();
            const draft = store.reviewDraft();

            if (!product) {
              patchState(store, {
                reviewFormError: { submit: 'Khong tim thay san pham de danh gia.' },
              });
              return EMPTY;
            }

            const formError = validateReviewDraft(draft);

            if (formError) {
              patchState(store, { reviewFormError: formError });
              return EMPTY;
            }

            patchState(store, { reviewSubmitting: true, reviewFormError: null });

            return productCatalogService.addProductReview(product.slug, draft).pipe(
              tap({
                next: review => addReview(review),
                error: () =>
                  patchState(store, {
                    reviewSubmitting: false,
                    reviewFormError: { submit: 'Chua the gui danh gia. Vui long thu lai.' },
                  }),
              }),
              catchError(() => EMPTY)
            );
          })
        )
      ),
      openReviewModal(): void {
        patchState(store, {
          reviewModalOpen: true,
          reviewFormError: null,
          reviewDraft: { ...EMPTY_REVIEW_DRAFT },
          reviewSuccessMessage: null,
        });
      },
      closeReviewModal(): void {
        patchState(store, {
          reviewModalOpen: false,
          reviewSubmitting: false,
          reviewFormError: null,
          reviewDraft: { ...EMPTY_REVIEW_DRAFT },
        });
      },
      updateReviewDraft(draft: ProductReviewDraft): void {
        patchState(store, {
          reviewDraft: { ...draft },
          reviewFormError: null,
        });
      },
      clearReviewSuccessMessage(): void {
        patchState(store, { reviewSuccessMessage: null });
      },
      incrementQuantity(): void {
        const product = store.product();

        if (!product?.inStock) {
          return;
        }

        patchState(store, {
          quantity: Math.min(store.quantity() + 1, product.maxQuantity),
        });
      },
      decrementQuantity(): void {
        if (!store.product()?.inStock) {
          return;
        }

        patchState(store, { quantity: Math.max(store.quantity() - 1, 1) });
      },
    };
  })
);

function validateReviewDraft(draft: ProductReviewDraft): ProductReviewFormError | null {
  const error: ProductReviewFormError = {};

  if (!draft.rating || draft.rating < 1) {
    error.rating = 'Vui long chon so sao.';
  }

  if (!draft.title.trim()) {
    error.title = 'Vui long nhap tieu de danh gia.';
  }

  if (!draft.comment.trim()) {
    error.comment = 'Vui long nhap noi dung danh gia.';
  }

  return Object.keys(error).length > 0 ? error : null;
}
