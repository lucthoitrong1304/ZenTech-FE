import { computed, inject, untracked } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntities,
  removeAllEntities,
  removeEntity,
  setAllEntities,
  updateEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, forkJoin, map, of, pipe, switchMap, tap } from 'rxjs';
import {
  PRODUCT_NOT_FOUND,
  ProductCatalogService,
} from '../../../product-catalog/data-access/services/product-catalog.service';
import {
  ProductReview,
} from '../../../product-catalog/data-access/models/product-catalog.models';
import {
  ProductDetailViewModel,
  ProductReviewDraft,
  ProductReviewFormError,
  ReviewImageUploadItem,
  ReviewVideoUploadItem,
} from '../models/product-detail-view.model';
import { ReviewMediaUploadService } from '../services/review-media-upload.service';

const MAX_REVIEW_IMAGES = 5;
const MAX_REVIEW_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_REVIEW_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_REVIEW_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_REVIEW_VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);

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

// State riêng của trang chi tiết sản phẩm, tách ảnh review sang entity collection.
type ProductDetailState = Omit<ProductDetailViewModel, 'reviewImages'> & {
  reviewVideo: ReviewVideoUploadItem | null;
};

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
  reviewVideo: null,
  reviewSuccessMessage: null,
  quantity: 1,
};

export const ProductDetailStore = signalStore(
  withState<ProductDetailState>(INITIAL_STATE),
  withEntities<ReviewImageUploadItem, 'reviewImage'>({
    entity: {} as ReviewImageUploadItem,
    collection: 'reviewImage',
  }),
  withComputed(({ product, quantity, selectedVariantId, reviewImageEntities, reviewVideo }) => ({
    // Danh sách ảnh review đang được chọn trong modal.
    reviewImages: computed(() => reviewImageEntities()),
    // Cho biết video review hiện có đang trong trạng thái upload hay không.
    reviewVideoUploading: computed(() => reviewVideo()?.status === 'uploading'),
    // Lấy biến thể đang chọn; nếu chưa chọn thì fallback về biến thể đầu tiên.
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
    // Bộ ảnh hiển thị ở gallery sản phẩm.
    gallery: computed(() => product()?.gallery ?? []),
    // Các sản phẩm cùng nhóm với sản phẩm hiện tại.
    groupProducts: computed(() => product()?.groupProducts ?? []),
    // Giá bán thực tế của biến thể đang chọn.
    selectedPrice: computed(() => {
      const currentProduct = product();
      const variant =
        currentProduct?.variants.find(item => item.id === selectedVariantId()) ??
        currentProduct?.variants[0];

      return variant?.salePrice ?? variant?.originalPrice ?? currentProduct?.price ?? 0;
    }),
    // Giá gốc chỉ hiển thị khi biến thể đang có giá khuyến mãi.
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
    // Số lượng tồn kho của biến thể đang chọn.
    selectedStockQuantity: computed(() => {
      const currentProduct = product();
      const variant =
        currentProduct?.variants.find(item => item.id === selectedVariantId()) ??
        currentProduct?.variants[0];

      return variant?.stockQuantity ?? currentProduct?.maxQuantity ?? 0;
    }),
    // Kiểm tra biến thể đang chọn còn hàng hay không.
    selectedInStock: computed(() => {
      const currentProduct = product();
      const variant =
        currentProduct?.variants.find(item => item.id === selectedVariantId()) ??
        currentProduct?.variants[0];

      return (variant?.stockQuantity ?? currentProduct?.maxQuantity ?? 0) > 0;
    }),
    // Cho phép tăng số lượng khi chưa vượt quá tồn kho.
    canIncrement: computed(() => {
      const variant = product()?.variants.find(item => item.id === selectedVariantId());
      const stockQuantity = variant?.stockQuantity ?? product()?.maxQuantity ?? 0;

      return stockQuantity > 0 && quantity() < stockQuantity;
    }),
    // Cho phép giảm số lượng khi số lượng hiện tại lớn hơn 1.
    canDecrement: computed(() => {
      const variant = product()?.variants.find(item => item.id === selectedVariantId());
      return (variant?.stockQuantity ?? product()?.maxQuantity ?? 0) > 0 && quantity() > 1;
    }),
    // Tổng số review đang hiển thị theo dữ liệu product hiện tại.
    reviewCount: computed(() => product()?.reviewCount ?? 0),
    // Điểm rating trung bình của sản phẩm.
    rating: computed(() => product()?.rating ?? 0),
    // Kiểm tra có ảnh nào đang upload hay không để khóa submit/modal.
    reviewImageUploading: computed(() =>
      reviewImageEntities().some(image => image.status === 'uploading')
    ),
    // Kiểm tra có ảnh upload lỗi để hiển thị trạng thái retry/error.
    reviewImageFailed: computed(() =>
      reviewImageEntities().some(image => image.status === 'failed')
    ),
  })),
  withMethods(
    (
      store,
      productCatalogService = inject(ProductCatalogService),
      reviewMediaUploadService = inject(ReviewMediaUploadService)
    ) => {
      // Đọc ảnh review ngoài tracking để tránh effect/rxMethod phụ thuộc signal không cần thiết.
      const readReviewImages = (): ReviewImageUploadItem[] =>
        untracked(() => store.reviewImages());

      // Đọc video review ngoài tracking để dùng trong các thao tác submit/reset.
      const readReviewVideo = (): ReviewVideoUploadItem | null =>
        untracked(() => store.reviewVideo());

      // Thu hồi object URL của ảnh preview để tránh rò rỉ bộ nhớ trên trình duyệt.
      const clearPreviewUrls = (images: ReviewImageUploadItem[]): void => {
        images.forEach(image => URL.revokeObjectURL(image.previewUrl));
      };

      // Thu hồi object URL của video preview khi đóng modal hoặc đổi sản phẩm.
      const clearVideoPreviewUrl = (video: ReviewVideoUploadItem | null): void => {
        if (video?.previewUrl) {
          URL.revokeObjectURL(video.previewUrl);
        }
      };

      // Lấy danh sách fileKey của các ảnh đã upload thành công.
      const getUploadedImageKeys = (images = readReviewImages()): string[] =>
        images
          .filter(image => image.status === 'uploaded' && !!image.fileKey)
          .map(image => image.fileKey as string);

      // Lấy fileKey của video đã upload, nếu video đã sẵn sàng.
      const getUploadedVideoKey = (video = readReviewVideo()): string | undefined =>
        video?.status === 'uploaded' ? video.videoKey : undefined;

      // Đồng bộ fileKey media vào draft để payload review luôn phản ánh media hiện tại.
      const syncDraftMediaKeys = (
        images = readReviewImages(),
        video = readReviewVideo()
      ): void => {
        patchState(store, {
          reviewDraft: {
            ...store.reviewDraft(),
            imageKeys: getUploadedImageKeys(images),
            videoKey: video?.status === 'uploaded' ? video.videoKey : undefined,
          },
        });
      };

      // Áp kết quả upload cho nhiều ảnh review và trả về danh sách ảnh mới nhất.
      const updateReviewImages = (
        patches: ReviewImageUploadResult[]
      ): ReviewImageUploadItem[] => {
        const reviewImages = store.reviewImages().map(image => {
          const patch = patches.find(item => item.id === image.id);
          return patch ? { ...image, ...patch } : image;
        });

        patchState(store, setAllEntities(reviewImages, REVIEW_IMAGE_ENTITY_CONFIG));
        syncDraftMediaKeys(reviewImages);
        return reviewImages;
      };

      // Đánh dấu các ảnh đang chờ thành trạng thái uploading trước khi gọi API upload.
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

      // Reset riêng trạng thái modal review và dọn các preview URL đang giữ trong bộ nhớ.
      const resetReviewState = (): void => {
        clearPreviewUrls(readReviewImages());
        clearVideoPreviewUrl(readReviewVideo());
        patchState(
          store,
          removeAllEntities(REVIEW_IMAGE_ENTITY_CONFIG),
          {
            reviewModalOpen: false,
            reviewSubmitting: false,
            reviewFormError: null,
            reviewDraft: { ...EMPTY_REVIEW_DRAFT },
            reviewVideo: null,
          }
        );
      };

      // Reset toàn bộ dữ liệu trang trước khi load sản phẩm mới.
      const resetForLoad = (): void => {
        clearPreviewUrls(readReviewImages());
        clearVideoPreviewUrl(readReviewVideo());
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
            reviewVideo: null,
            reviewSuccessMessage: null,
            quantity: 1,
          }
        );
      };

      // Thêm review mới vào đầu danh sách và tính lại rating cục bộ sau khi submit thành công.
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
            reviewVideo: null,
            reviewSuccessMessage: 'Đánh giá của bạn đã được thêm vào sản phẩm thành công',
          }
        );
      };

      // Gửi review lên backend sau khi đã có sẵn imageKeys/videoKey.
      const submitReviewWithMediaKeys = (
        productId: string,
        draft: ProductReviewDraft,
        imageKeys: string[],
        videoKey: string | undefined
      ) =>
        productCatalogService
          .addProductReview(productId, { ...draft, imageKeys, videoKey })
          .pipe(
            tap({
              next: review => {
                clearPreviewUrls(readReviewImages());
                clearVideoPreviewUrl(readReviewVideo());
                addReview(review);
              },
              error: () =>
                patchState(store, {
                  reviewSubmitting: false,
                  reviewFormError: { submit: 'Chưa thể gửi đánh giá. Vui lòng thử lại.' },
                }),
            }),
            catchError(() => EMPTY)
          );

      return {
        // Load chi tiết sản phẩm cùng danh sách review ban đầu.
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
                    const isNotFound =
                      error instanceof Error && error.message === PRODUCT_NOT_FOUND;

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
        // Validate form, upload media nếu cần, rồi submit review.
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

              // Gom các media chưa upload để xử lý trước khi tạo review.
              const pendingImages = readReviewImages().filter(
                image => image.status !== 'uploaded' && !!image.file
              );
              const pendingVideo = readReviewVideo();
              const hasPendingVideo =
                pendingVideo !== null && pendingVideo.status !== 'uploaded';

              // Nếu không còn media chờ upload thì gửi review ngay.
              if (pendingImages.length === 0 && !hasPendingVideo) {
                return submitReviewWithMediaKeys(
                  product.id,
                  draft,
                  getUploadedImageKeys(),
                  getUploadedVideoKey()
                );
              }

              // Chuyển trạng thái UI sang uploading trước khi gọi upload thật.
              if (pendingImages.length > 0) {
                markReviewImagesUploading(pendingImages);
              }
              if (hasPendingVideo && pendingVideo) {
                patchState(store, {
                  reviewVideo: { ...pendingVideo, status: 'uploading', error: undefined },
                });
              }

              // Upload từng ảnh và giữ lại kết quả theo id để cập nhật đúng item preview.
              const imageUploads$ = pendingImages.map(image =>
                reviewMediaUploadService.uploadReviewImage(image.file).pipe(
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
                      error: 'Không thể tải ảnh lên. Vui lòng thử lại.',
                    } satisfies ReviewImageUploadResult)
                  )
                )
              );

              // Upload video nếu user có chọn video chưa upload.
              const videoUpload$ =
                hasPendingVideo && pendingVideo
                  ? reviewMediaUploadService.uploadReviewVideo(pendingVideo.file).pipe(
                      map((videoKey): { status: 'uploaded'; videoKey: string } => ({
                        status: 'uploaded',
                        videoKey,
                      })),
                      catchError(() =>
                        of({ status: 'failed' as const, videoKey: undefined as unknown as string })
                      )
                    )
                  : of(null);

              return forkJoin({
                imageResults: imageUploads$.length > 0 ? forkJoin(imageUploads$) : of([]),
                videoResult: videoUpload$,
              }).pipe(
                switchMap(({ imageResults, videoResult }) => {
                  // Cập nhật trạng thái ảnh sau khi upload xong.
                  const updatedImages =
                    imageResults.length > 0 ? updateReviewImages(imageResults) : readReviewImages();
                  const imageUploadFailed = imageResults.some(r => r.status === 'failed');

                  // Cập nhật trạng thái video và lấy videoKey cuối cùng.
                  let finalVideoKey: string | undefined;
                  if (videoResult !== null) {
                    if (videoResult.status === 'failed') {
                      const currentVideo = readReviewVideo();
                      if (currentVideo) {
                        patchState(store, {
                          reviewVideo: {
                            ...currentVideo,
                            status: 'failed',
                            error: 'Không thể tải video lên. Vui lòng thử lại.',
                          },
                        });
                      }
                    } else {
                      finalVideoKey = videoResult.videoKey;
                      const currentVideo = readReviewVideo();
                      if (currentVideo) {
                        patchState(store, {
                          reviewVideo: {
                            ...currentVideo,
                            status: 'uploaded',
                            videoKey: finalVideoKey,
                          },
                        });
                      }
                    }
                  } else {
                    finalVideoKey = getUploadedVideoKey();
                  }

                  if (imageUploadFailed || (hasPendingVideo && videoResult?.status === 'failed')) {
                    patchState(store, {
                      reviewSubmitting: false,
                      reviewFormError: {
                        submit: 'Không thể tải media lên. Vui lòng thử lại.',
                      },
                    });
                    return EMPTY;
                  }

                  return submitReviewWithMediaKeys(
                    product.id,
                    draft,
                    getUploadedImageKeys(updatedImages),
                    finalVideoKey
                  );
                })
              );
            })
          )
        ),
        // Mở modal viết review và tạo draft sạch.
        openReviewModal(): void {
          clearPreviewUrls(readReviewImages());
          clearVideoPreviewUrl(readReviewVideo());
          patchState(
            store,
            removeAllEntities(REVIEW_IMAGE_ENTITY_CONFIG),
            {
              reviewModalOpen: true,
              reviewFormError: null,
              reviewDraft: { ...EMPTY_REVIEW_DRAFT },
              reviewVideo: null,
              reviewSuccessMessage: null,
            }
          );
        },
        // Đóng modal review và reset toàn bộ dữ liệu nhập tạm.
        closeReviewModal(): void {
          resetReviewState();
        },
        // Cập nhật nội dung draft từ modal, đồng thời giữ media keys đã upload.
        updateReviewDraft(draft: ProductReviewDraft): void {
          patchState(store, {
            reviewDraft: {
              ...draft,
              imageKeys: getUploadedImageKeys(),
              videoKey: getUploadedVideoKey(),
            },
            reviewFormError: null,
          });
        },
        // Nhận danh sách ảnh user chọn, validate loại file/kích thước/số lượng rồi tạo preview.
        selectReviewImages(files: File[]): void {
          if (store.reviewSubmitting()) {
            return;
          }

          const currentVideo = readReviewVideo();
          const videoSlotUsed = currentVideo !== null ? 1 : 0;
          const maxImages = MAX_REVIEW_IMAGES - videoSlotUsed;
          const availableSlots = maxImages - store.reviewImages().length;

          if (availableSlots <= 0) {
            patchState(store, {
              reviewFormError: {
                submit: `Mỗi đánh giá chỉ được tải tối đa ${maxImages} ảnh.`,
              },
            });
            return;
          }

          const nextFiles = files.slice(0, availableSlots);
          const rejectedByLimit = files.length > availableSlots;
          const validFiles: File[] = [];

          for (const file of nextFiles) {
            if (!ALLOWED_REVIEW_IMAGE_TYPES.has(file.type)) {
              patchState(store, {
                reviewFormError: { submit: 'Chỉ hỗ trợ ảnh JPEG, PNG hoặc WEBP.' },
              });
              continue;
            }

            if (file.size > MAX_REVIEW_IMAGE_SIZE_BYTES) {
              patchState(store, {
                reviewFormError: { submit: 'Mỗi ảnh không được vượt quá 5MB.' },
              });
              continue;
            }

            validFiles.push(file);
          }

          if (rejectedByLimit) {
            patchState(store, {
              reviewFormError: {
                submit: `Mỗi đánh giá chỉ được tải tối đa ${maxImages} ảnh.`,
              },
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
        // Xóa một ảnh khỏi draft và thu hồi URL preview của ảnh đó.
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
          syncDraftMediaKeys();
        },
        // Nhận video user chọn, validate loại file/kích thước rồi tạo preview.
        selectReviewVideo(file: File): void {
          if (store.reviewSubmitting()) {
            return;
          }

          if (store.reviewVideo() !== null) {
            patchState(store, {
              reviewFormError: { submit: 'Mỗi đánh giá chỉ được tải lên 1 video.' },
            });
            return;
          }

          if (!ALLOWED_REVIEW_VIDEO_TYPES.has(file.type)) {
            patchState(store, {
              reviewFormError: { submit: 'Chỉ hỗ trợ video MP4 hoặc WEBM.' },
            });
            return;
          }

          if (file.size > MAX_REVIEW_VIDEO_SIZE_BYTES) {
            patchState(store, {
              reviewFormError: { submit: 'Video không được vượt quá 50MB.' },
            });
            return;
          }

          const videoItem: ReviewVideoUploadItem = {
            id: createReviewMediaId(),
            file,
            fileName: file.name,
            previewUrl: URL.createObjectURL(file),
            status: 'pending',
          };

          patchState(store, { reviewVideo: videoItem, reviewFormError: null });
        },
        // Xóa video khỏi draft và thu hồi URL preview.
        removeReviewVideo(): void {
          clearVideoPreviewUrl(readReviewVideo());
          patchState(store, { reviewVideo: null, reviewFormError: null });
          syncDraftMediaKeys();
        },
        // Chọn biến thể sản phẩm và reset số lượng theo tồn kho của biến thể.
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
        // Xóa thông báo review thành công sau khi toast đã hiển thị.
        clearReviewSuccessMessage(): void {
          patchState(store, { reviewSuccessMessage: null });
        },
        // Tăng số lượng mua nhưng không vượt quá tồn kho.
        incrementQuantity(): void {
          const product = store.product();
          const variant = product?.variants.find(
            item => item.id === store.selectedVariantId()
          );
          const maxQuantity = variant?.stockQuantity ?? product?.maxQuantity ?? 0;

          if (maxQuantity <= 0) {
            return;
          }

          patchState(store, {
            quantity: Math.min(store.quantity() + 1, maxQuantity),
          });
        },
        // Giảm số lượng mua nhưng không thấp hơn 1.
        decrementQuantity(): void {
          const product = store.product();
          const variant = product?.variants.find(
            item => item.id === store.selectedVariantId()
          );

          if ((variant?.stockQuantity ?? product?.maxQuantity ?? 0) <= 0) {
            return;
          }

          patchState(store, { quantity: Math.max(store.quantity() - 1, 1) });
        },
      };
    }
  )
);

// Tạo id tạm cho ảnh review để quản lý trong entity collection phía FE.
function createReviewImageId(): string {
  return `review-image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Tạo id tạm cho media review không phải ảnh, hiện dùng cho video.
function createReviewMediaId(): string {
  return `review-media-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Kiểm tra dữ liệu tối thiểu trước khi cho phép gửi review.
function validateReviewDraft(draft: ProductReviewDraft): ProductReviewFormError | null {
  const error: ProductReviewFormError = {};

  if (!draft.rating || draft.rating < 1) {
    error.rating = 'Vui lòng chọn số sao.';
  }

  if (!draft.comment.trim()) {
    error.comment = 'Vui lòng nhập nội dung đánh giá.';
  }

  return Object.keys(error).length > 0 ? error : null;
}
