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

export type ReviewImageUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export interface ReviewImageUploadItem {
  id: string;
  file?: File;
  fileName: string;
  previewUrl: string;
  status: ReviewImageUploadStatus;
  fileKey?: string;
  error?: string;
}

export type ReviewVideoUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export interface ReviewVideoUploadItem {
  id: string;
  file?: File;
  fileName: string;
  previewUrl: string;
  status: ReviewVideoUploadStatus;
  videoKey?: string;
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
  editingReviewId: string | null;
  reviewSubmitting: boolean;
  reviewFormError: ProductReviewFormError | null;
  reviewDraft: ProductReviewDraft;
  reviewImages: ReviewImageUploadItem[];
  reviewVideo: ReviewVideoUploadItem | null;
  reviewSuccessMessage: string | null;
  quantity: number;
}
