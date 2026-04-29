import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, forkJoin, of, pipe, switchMap, tap } from 'rxjs';
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
  selectedVariantId: null,
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
  withComputed(({ product, quantity, selectedVariantId }) => ({
    selectedVariant: computed(() => {
      const currentProduct = product();
      const currentVariantId = selectedVariantId();

      if (!currentProduct?.variants.length) {
        return null;
      }

      return (
        currentProduct.variants.find(variant => variant.id === currentVariantId) ??
        currentProduct.variants[0]
      );
    }),
    gallery: computed(() => product()?.gallery ?? []),
    groupProducts: computed(() => product()?.groupProducts ?? []),
    selectedPrice: computed(() => {
      const currentProduct = product();
      const variant =
        currentProduct?.variants.find(item => item.id === selectedVariantId()) ??
        currentProduct?.variants[0];

      return variant?.salePrice ?? variant?.originalPrice ?? currentProduct?.price ?? 0;
    }),
    selectedOriginalPrice: computed(() => {
      const currentProduct = product();
      const variant =
        currentProduct?.variants.find(item => item.id === selectedVariantId()) ??
        currentProduct?.variants[0];

      if (variant) {
        return variant.salePrice ? variant.originalPrice : undefined;
      }

      return currentProduct?.originalPrice;
    }),
    selectedStockQuantity: computed(() => {
      const currentProduct = product();
      const variant =
        currentProduct?.variants.find(item => item.id === selectedVariantId()) ??
        currentProduct?.variants[0];

      return variant?.stockQuantity ?? currentProduct?.maxQuantity ?? 0;
    }),
    selectedInStock: computed(() => {
      const currentProduct = product();
      const variant =
        currentProduct?.variants.find(item => item.id === selectedVariantId()) ??
        currentProduct?.variants[0];

      return (variant?.stockQuantity ?? currentProduct?.maxQuantity ?? 0) > 0;
    }),
    canIncrement: computed(() => {
      const variant = product()?.variants.find(item => item.id === selectedVariantId());
      const stockQuantity = variant?.stockQuantity ?? product()?.maxQuantity ?? 0;

      return stockQuantity > 0 && quantity() < stockQuantity;
    }),
    canDecrement: computed(() => {
      const variant = product()?.variants.find(item => item.id === selectedVariantId());
      return (variant?.stockQuantity ?? product()?.maxQuantity ?? 0) > 0 && quantity() > 1;
    }),
    reviewCount: computed(() => product()?.reviewCount ?? 0),
    rating: computed(() => product()?.rating ?? 0),
  })),
  withMethods((store, productCatalogService = inject(ProductCatalogService)) => {
    const resetForLoad = (): void => {
      patchState(store, {
        product: null,
        relatedProducts: [],
        selectedVariantId: null,
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
        reviewSuccessMessage: 'Đánh giá của bạn đã được thêm vào sản phẩm thành công',
      });
    };

    return {
      loadProduct: rxMethod<string>(
        pipe(
          tap(() => resetForLoad()),
          switchMap(slug =>
            forkJoin({
              product: productCatalogService.getProductDetail(slug),
              reviews: productCatalogService
                .getProductReviews(slug)
                .pipe(catchError(() => of<ProductReview[]>([]))),
            }).pipe(
              tap({
                next: ({ product, reviews }) => {
                  const selectedVariant = product.variants[0] ?? null;

                  patchState(store, {
                    product: {
                      ...product,
                      reviews,
                    },
                    relatedProducts: product.relatedProducts ?? [],
                    selectedVariantId: selectedVariant?.id ?? null,
                    loading: false,
                    error: null,
                    isNotFound: false,
                    quantity: (selectedVariant?.stockQuantity ?? product.maxQuantity) > 0 ? 1 : 0,
                  });
                },
                error: error => {
                  const isNotFound = error instanceof Error && error.message === PRODUCT_NOT_FOUND;

                  patchState(store, {
                    product: null,
                    relatedProducts: [],
                    selectedVariantId: null,
                    loading: false,
                    error: isNotFound
                      ? 'Sản phẩm này hiện chưa tồn tại.'
                      : 'Không thể tải thông tin sản phẩm lúc này.',
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
                reviewFormError: { submit: 'Không tìm thấy sản phẩm để đánh giá.' },
              });
              return EMPTY;
            }

            const formError = validateReviewDraft(draft);

            if (formError) {
              patchState(store, { reviewFormError: formError });
              return EMPTY;
            }

            patchState(store, { reviewSubmitting: true, reviewFormError: null });

            return productCatalogService.addProductReview(product.id, draft).pipe(
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
      selectVariant(variantId: string): void {
        const product = store.product();
        const variant = product?.variants.find(item => item.id === variantId);

        if (!variant) {
          return;
        }

        patchState(store, {
          selectedVariantId: variant.id,
          quantity: variant.stockQuantity > 0 ? 1 : 0,
        });
      },
      clearReviewSuccessMessage(): void {
        patchState(store, { reviewSuccessMessage: null });
      },
      incrementQuantity(): void {
        const product = store.product();
        const variant = product?.variants.find(item => item.id === store.selectedVariantId());
        const maxQuantity = variant?.stockQuantity ?? product?.maxQuantity ?? 0;

        if (maxQuantity <= 0) {
          return;
        }

        patchState(store, {
          quantity: Math.min(store.quantity() + 1, maxQuantity),
        });
      },
      decrementQuantity(): void {
        const product = store.product();
        const variant = product?.variants.find(item => item.id === store.selectedVariantId());

        if ((variant?.stockQuantity ?? product?.maxQuantity ?? 0) <= 0) {
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

  if (!draft.comment.trim()) {
    error.comment = 'Vui long nhap noi dung danh gia.';
  }

  return Object.keys(error).length > 0 ? error : null;
}
