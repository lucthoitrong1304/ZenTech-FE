import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { EMPTY, catchError, switchMap, tap, withLatestFrom } from 'rxjs';
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

@Injectable()
export class ProductDetailStore extends ComponentStore<ProductDetailViewModel> {
  private readonly productCatalogService = inject(ProductCatalogService);

  readonly vm$ = this.select(state => state);
  readonly reviewSuccessMessage$ = this.select(state => state.reviewSuccessMessage);

  readonly loadProduct = this.effect<string>(slug$ =>
    slug$.pipe(
      tap(() =>
        this.patchState({
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
        })
      ),
      switchMap(slug =>
        this.productCatalogService.getProductDetail(slug).pipe(
          tap({
            next: product => this.setProduct(product),
            error: error => this.handleLoadError(error),
          }),
          catchError(() => EMPTY)
        )
      )
    )
  );

  readonly submitReview = this.effect<void>(submit$ =>
    submit$.pipe(
      withLatestFrom(this.state$),
      switchMap(([, state]) => {
        const product = state.product;

        if (!product) {
          this.patchState({
            reviewFormError: { submit: 'Không tìm thấy sản phẩm để đánh giá.' },
          });
          return EMPTY;
        }

        const formError = validateReviewDraft(state.reviewDraft);

        if (formError) {
          this.patchState({ reviewFormError: formError });
          return EMPTY;
        }

        this.patchState({ reviewSubmitting: true, reviewFormError: null });

        return this.productCatalogService.addProductReview(product.slug, state.reviewDraft).pipe(
          tap({
            next: review => this.addReview(review),
            error: () =>
              this.patchState({
                reviewSubmitting: false,
                reviewFormError: { submit: 'Chưa thể gửi đánh giá. Vui lòng thử lại.' },
              }),
          }),
          catchError(() => EMPTY)
        );
      })
    )
  );

  constructor() {
    super(INITIAL_STATE);
  }

  openReviewModal(): void {
    this.patchState({
      reviewModalOpen: true,
      reviewFormError: null,
      reviewDraft: { ...EMPTY_REVIEW_DRAFT },
      reviewSuccessMessage: null,
    });
  }

  closeReviewModal(): void {
    this.patchState({
      reviewModalOpen: false,
      reviewSubmitting: false,
      reviewFormError: null,
      reviewDraft: { ...EMPTY_REVIEW_DRAFT },
    });
  }

  updateReviewDraft(draft: ProductReviewDraft): void {
    this.patchState({
      reviewDraft: { ...draft },
      reviewFormError: null,
    });
  }

  clearReviewSuccessMessage(): void {
    this.patchState({ reviewSuccessMessage: null });
  }

  incrementQuantity(): void {
    const state = this.get();
    const maxQuantity = state.product?.maxQuantity ?? 1;

    this.patchState({ quantity: Math.min(state.quantity + 1, maxQuantity) });
  }

  decrementQuantity(): void {
    const quantity = this.get().quantity;

    this.patchState({ quantity: Math.max(quantity - 1, 1) });
  }

  private setProduct(product: ProductDetail): void {
    this.patchState({
      product,
      relatedProducts: this.productCatalogService.getRelatedProducts(product.relatedProductSlugs),
      loading: false,
      error: null,
      isNotFound: false,
      quantity: product.inStock ? 1 : 0,
    });
  }

  private handleLoadError(error: unknown): void {
    const isNotFound = error instanceof Error && error.message === PRODUCT_NOT_FOUND;

    this.patchState({
      product: null,
      relatedProducts: [],
      loading: false,
      error: isNotFound
        ? 'Sản phẩm này hiện chưa tồn tại trong catalog mock.'
        : 'Không thể tải thông tin sản phẩm lúc này.',
      isNotFound,
    });
  }

  private addReview(review: ProductReview): void {
    const product = this.get().product;

    if (!product) {
      return;
    }

    const reviews = [review, ...product.reviews];
    const rating = Number(
      (reviews.reduce((total, item) => total + item.rating, 0) / reviews.length).toFixed(1)
    );

    this.patchState({
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
      reviewSuccessMessage: 'Đánh giá của bạn đã được thêm vào sản phẩm.',
    });
  }
}

function validateReviewDraft(draft: ProductReviewDraft): ProductReviewFormError | null {
  const error: ProductReviewFormError = {};

  if (!draft.rating || draft.rating < 1) {
    error.rating = 'Vui lòng chọn số sao.';
  }

  if (!draft.title.trim()) {
    error.title = 'Vui lòng nhập tiêu đề đánh giá.';
  }

  if (!draft.comment.trim()) {
    error.comment = 'Vui lòng nhập nội dung đánh giá.';
  }

  return Object.keys(error).length > 0 ? error : null;
}
