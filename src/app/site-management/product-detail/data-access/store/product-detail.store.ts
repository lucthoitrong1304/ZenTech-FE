import { computed, inject, untracked } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntities,
  removeAllEntities,
  removeEntity,
  setAllEntities,
  updateEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, forkJoin, map, of, pipe, switchMap, tap } from 'rxjs';
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

type ReviewImageUploadResult =
  | { id: string; status: 'uploaded'; fileKey: string }
  | { id: string; status: 'failed'; error: string };

const EMPTY_REVIEW_DRAFT: ProductReviewDraft = {
  reviewerName: '',
  rating: 0,
  title: '',
  comment: '',
};

const REVIEW_IMAGE_ENTITY_CONFIG = {
  collection: 'reviewImage',
  selectId: (image: ReviewImageUploadItem) => image.id,
} as const;

type ProductDetailState = Omit<ProductDetailViewModel, 'reviewImages'>;

const INITIAL_STATE: ProductDetailState = {
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
  withState<ProductDetailState>(INITIAL_STATE),
  withEntities<ReviewImageUploadItem, 'reviewImage'>({
    entity: {} as ReviewImageUploadItem,
    collection: 'reviewImage',
  }),
  withComputed(({ product, quantity, selectedVariantId, reviewImageEntities }) => ({
    reviewImages: computed(() => reviewImageEntities()),
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
    reviewImageUploading: computed(() =>
      reviewImageEntities().some(image => image.status === 'uploading')
    ),
    reviewImageFailed: computed(() =>
      reviewImageEntities().some(image => image.status === 'failed')
    ),
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
      patchState(
        store,
        updateEntity({ id, changes: patch }, REVIEW_IMAGE_ENTITY_CONFIG)
      );
      syncDraftImageKeys();
    };

    const updateReviewImages = (patches: ReviewImageUploadResult[]): ReviewImageUploadItem[] => {
      const reviewImages = store.reviewImages().map(image => {
        const patch = patches.find(item => item.id === image.id);
        return patch ? { ...image, ...patch } : image;
      });

      patchState(store, setAllEntities(reviewImages, REVIEW_IMAGE_ENTITY_CONFIG));
      syncDraftImageKeys(reviewImages);
      return reviewImages;
    };

    const markReviewImagesUploading = (images: ReviewImageUploadItem[]): void => {
      patchState(
        store,
        updateEntities(
          {
            ids: images.map(image => image.id),
            changes: { status: 'uploading', error: undefined },
          },
          REVIEW_IMAGE_ENTITY_CONFIG
        )
      );
    };

    const resetForLoad = (): void => {
      clearPreviewUrls(readReviewImages());
      patchState(
        store,
        removeAllEntities(REVIEW_IMAGE_ENTITY_CONFIG),
        {
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
        }
      );
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

      patchState(
        store,
        removeAllEntities(REVIEW_IMAGE_ENTITY_CONFIG),
        {
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
        }
      );
    };

    const submitReviewWithImageKeys = (
      productId: string,
      draft: ProductReviewDraft,
      imageKeys: string[]
    ) =>
      productCatalogService.addProductReview(productId, { ...draft, imageKeys }).pipe(
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

            const uploadImages = readReviewImages().filter(
              image => image.status !== 'uploaded' && !!image.file
            );

            if (uploadImages.length === 0) {
              return submitReviewWithImageKeys(product.id, draft, getUploadedImageKeys());
            }

            markReviewImagesUploading(uploadImages);

            return forkJoin(
              uploadImages.map(image =>
                reviewImageUploadService.uploadReviewImage(image.file).pipe(
                  map(
                    fileKey =>
                      ({
                        id: image.id,
                        status: 'uploaded',
                        fileKey,
                      }) satisfies ReviewImageUploadResult
                  ),
                  catchError(() =>
                    of({
                      id: image.id,
                      status: 'failed',
                      error: 'Khong the tai anh len. Vui long thu lai.',
                    } satisfies ReviewImageUploadResult)
                  )
                )
              )
            ).pipe(
              switchMap(results => {
                const reviewImages = updateReviewImages(results);
                const failedUpload = results.some(result => result.status === 'failed');

                if (failedUpload) {
                  patchState(store, {
                    reviewSubmitting: false,
                    reviewFormError: { submit: 'Khong the tai anh len. Vui long thu lai.' },
                  });
                  return EMPTY;
                }

                return submitReviewWithImageKeys(product.id, draft, getUploadedImageKeys(reviewImages));
              })
            );
          })
        )
      ),
      openReviewModal(): void {
        patchState(
          store,
          removeAllEntities(REVIEW_IMAGE_ENTITY_CONFIG),
          {
            reviewModalOpen: true,
            reviewFormError: null,
            reviewDraft: { ...EMPTY_REVIEW_DRAFT },
            reviewSuccessMessage: null,
          }
        );
      },
      closeReviewModal(): void {
        clearPreviewUrls(readReviewImages());
        patchState(
          store,
          removeAllEntities(REVIEW_IMAGE_ENTITY_CONFIG),
          {
            reviewModalOpen: false,
            reviewSubmitting: false,
            reviewFormError: null,
            reviewDraft: { ...EMPTY_REVIEW_DRAFT },
          }
        );
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

        const uploadItems: ReviewImageUploadItem[] = validFiles.map(file => ({
          id: createReviewImageId(),
          file,
          fileName: file.name,
          previewUrl: URL.createObjectURL(file),
          status: 'pending' as const,
        }));

        patchState(
          store,
          addEntities(uploadItems, REVIEW_IMAGE_ENTITY_CONFIG),
          { reviewFormError: null }
        );
      },
      removeReviewImage(imageId: string): void {
        const image = store.reviewImages().find(item => item.id === imageId);

        if (image) {
          URL.revokeObjectURL(image.previewUrl);
        }

        patchState(
          store,
          removeEntity(imageId, REVIEW_IMAGE_ENTITY_CONFIG),
          { reviewFormError: null }
        );
        syncDraftImageKeys();
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
