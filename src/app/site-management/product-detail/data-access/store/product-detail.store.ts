import { computed, inject, untracked } from '@angular/core';
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
  ReviewImageUploadItem,
} from '../models/product-detail-view.model';
import { ReviewImageUploadService } from '../services/review-image-upload.service';

const MAX_REVIEW_IMAGES = 5;
const MAX_REVIEW_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_REVIEW_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
  reviewImages: [],
  reviewSuccessMessage: null,
  quantity: 1,
};

export const ProductDetailStore = signalStore(
  withState<ProductDetailViewModel>(INITIAL_STATE),
  withComputed(({ product, quantity, selectedVariantId, reviewImages }) => ({
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
    reviewImageUploading: computed(() => reviewImages().some(image => image.status === 'uploading')),
    reviewImageFailed: computed(() => reviewImages().some(image => image.status === 'failed')),
  })),
  withMethods((
    store,
    productCatalogService = inject(ProductCatalogService),
    reviewImageUploadService = inject(ReviewImageUploadService)
  ) => {
    const readReviewImages = (): ReviewImageUploadItem[] => untracked(() => store.reviewImages());

    const clearPreviewUrls = (images: ReviewImageUploadItem[]): void => {
      images.forEach(image => URL.revokeObjectURL(image.previewUrl));
    };

    const getUploadedImageKeys = (images = readReviewImages()): string[] =>
      images
        .filter(image => image.status === 'uploaded' && !!image.fileKey)
        .map(image => image.fileKey as string);

    const syncDraftImageKeys = (images = readReviewImages()): void => {
      patchState(store, {
        reviewDraft: {
          ...store.reviewDraft(),
          imageKeys: getUploadedImageKeys(images),
        },
      });
    };

    const updateReviewImage = (id: string, patch: Partial<ReviewImageUploadItem>): void => {
      const reviewImages = store.reviewImages().map(image =>
        image.id === id ? { ...image, ...patch } : image
      );

      patchState(store, { reviewImages });
      syncDraftImageKeys(reviewImages);
    };

    const resetForLoad = (): void => {
      clearPreviewUrls(readReviewImages());
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
        reviewImages: [],
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
        reviewImages: [],
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

            if (store.reviewImages().some(image => image.status === 'uploading')) {
              patchState(store, {
                reviewFormError: { submit: 'Vui long doi anh tai len hoan tat truoc khi gui.' },
              });
              return EMPTY;
            }

            if (store.reviewImages().some(image => image.status === 'failed')) {
              patchState(store, {
                reviewFormError: { submit: 'Vui long xoa anh loi truoc khi gui danh gia.' },
              });
              return EMPTY;
            }

            const payload: ProductReviewDraft = {
              ...draft,
              imageKeys: getUploadedImageKeys(),
            };

            patchState(store, { reviewSubmitting: true, reviewFormError: null });

            return productCatalogService.addProductReview(product.id, payload).pipe(
              tap({
                next: review => {
                  clearPreviewUrls(readReviewImages());
                  addReview(review);
                },
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
          reviewImages: [],
          reviewSuccessMessage: null,
        });
      },
      closeReviewModal(): void {
        clearPreviewUrls(readReviewImages());
        patchState(store, {
          reviewModalOpen: false,
          reviewSubmitting: false,
          reviewFormError: null,
          reviewDraft: { ...EMPTY_REVIEW_DRAFT },
          reviewImages: [],
        });
      },
      updateReviewDraft(draft: ProductReviewDraft): void {
        patchState(store, {
          reviewDraft: { ...draft, imageKeys: getUploadedImageKeys() },
          reviewFormError: null,
        });
      },
      selectReviewImages(files: File[]): void {
        if (store.reviewSubmitting()) {
          return;
        }

        const availableSlots = MAX_REVIEW_IMAGES - store.reviewImages().length;

        if (availableSlots <= 0) {
          patchState(store, {
            reviewFormError: { submit: 'Moi danh gia chi duoc tai toi da 5 anh.' },
          });
          return;
        }

        const nextFiles = files.slice(0, availableSlots);
        const rejectedByLimit = files.length > availableSlots;
        const validFiles: File[] = [];

        for (const file of nextFiles) {
          if (!ALLOWED_REVIEW_IMAGE_TYPES.has(file.type)) {
            patchState(store, {
              reviewFormError: { submit: 'Chi ho tro anh JPEG, PNG hoac WEBP.' },
            });
            continue;
          }

          if (file.size > MAX_REVIEW_IMAGE_SIZE_BYTES) {
            patchState(store, {
              reviewFormError: { submit: 'Moi anh khong duoc vuot qua 5MB.' },
            });
            continue;
          }

          validFiles.push(file);
        }

        if (rejectedByLimit) {
          patchState(store, {
            reviewFormError: { submit: 'Moi danh gia chi duoc tai toi da 5 anh.' },
          });
        }

        if (validFiles.length === 0) {
          return;
        }

        const uploadItems = validFiles.map(file => ({
          id: createReviewImageId(),
          fileName: file.name,
          previewUrl: URL.createObjectURL(file),
          status: 'uploading' as const,
        }));

        patchState(store, {
          reviewImages: [...store.reviewImages(), ...uploadItems],
          reviewFormError: null,
        });

        uploadItems.forEach((item, index) => {
          reviewImageUploadService
            .uploadReviewImage(validFiles[index])
            .pipe(
              tap({
                next: fileKey => updateReviewImage(item.id, { status: 'uploaded', fileKey }),
                error: () =>
                  updateReviewImage(item.id, {
                    status: 'failed',
                    error: 'Khong the tai anh len. Vui long thu lai.',
                  }),
              }),
              catchError(() => EMPTY)
            )
            .subscribe();
        });
      },
      removeReviewImage(imageId: string): void {
        const image = store.reviewImages().find(item => item.id === imageId);
        const reviewImages = store.reviewImages().filter(item => item.id !== imageId);

        if (image) {
          URL.revokeObjectURL(image.previewUrl);
        }

        patchState(store, {
          reviewImages,
          reviewFormError: null,
        });
        syncDraftImageKeys(reviewImages);
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

function createReviewImageId(): string {
  return `review-image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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
