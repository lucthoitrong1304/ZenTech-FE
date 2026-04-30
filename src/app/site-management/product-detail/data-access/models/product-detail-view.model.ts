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

export type ReviewImageUploadStatus = 'uploading' | 'uploaded' | 'failed';

export interface ReviewImageUploadItem {
  id: string;
  fileName: string;
  previewUrl: string;
  status: ReviewImageUploadStatus;
  fileKey?: string;
  error?: string;
}

export interface ProductDetailViewModel {
  product: ProductDetail | null;
  relatedProducts: ProductListItem[];
  selectedVariantId: string | null;
  loading: boolean;
  error: string | null;
  isNotFound: boolean;
  reviewModalOpen: boolean;
  reviewSubmitting: boolean;
  reviewFormError: ProductReviewFormError | null;
  reviewDraft: ProductReviewDraft;
  reviewImages: ReviewImageUploadItem[];
  reviewSuccessMessage: string | null;
  quantity: number;
}
