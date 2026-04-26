import {
  ProductDetail,
  ProductListItem,
  ProductReviewPayload,
} from '../../../product-catalog/data-access/models/product-catalog.models';

export interface ProductReviewDraft extends ProductReviewPayload {}

export interface ProductReviewFormError {
  rating?: string;
  title?: string;
  comment?: string;
  submit?: string;
}

export interface ProductDetailViewModel {
  product: ProductDetail | null;
  relatedProducts: ProductListItem[];
  loading: boolean;
  error: string | null;
  isNotFound: boolean;
  reviewModalOpen: boolean;
  reviewSubmitting: boolean;
  reviewFormError: ProductReviewFormError | null;
  reviewDraft: ProductReviewDraft;
  reviewSuccessMessage: string | null;
  quantity: number;
}
