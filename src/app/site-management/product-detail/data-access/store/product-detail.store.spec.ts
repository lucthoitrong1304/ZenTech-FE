import '@angular/compiler';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import {
  ProductDetail,
  ProductReview,
} from '../../../product-catalog/data-access/models/product-catalog.models';
import { ProductCatalogService } from '../../../product-catalog/data-access/services/product-catalog.service';
import { ReviewMediaUploadService } from '../services/review-media-upload.service';
import { ProductDetailStore } from './product-detail.store';

describe('ProductDetailStore', () => {
  const product: ProductDetail = {
    id: 'product-1',
    categorySlug: '',
    slug: 'product-1',
    name: 'Alpha',
    image: '/alpha.webp',
    price: 90,
    originalPrice: 100,
    rating: 4,
    reviewCount: 1,
    inStock: true,
    gallery: ['/alpha.webp'],
    highlights: ['Fast'],
    specs: [{ label: 'Specifications', value: 'TKL' }],
    maxQuantity: 2,
    reviews: [],
    relatedProductSlugs: [],
    relatedProducts: [
      {
        id: 'product-2',
        categorySlug: '',
        slug: 'product-2',
        name: 'Beta',
        image: '/beta.webp',
        price: 70,
        inStock: true,
      },
    ],
    variants: [
      {
        id: 'variant-1',
        name: 'Black',
        colorCode: '#111111',
        originalPrice: 100,
        salePrice: 90,
        stockQuantity: 2,
      },
      {
        id: 'variant-2',
        name: 'Silver',
        colorCode: '#d1d5db',
        originalPrice: 120,
        stockQuantity: 4,
      },
    ],
  };

  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:review-image'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(() => undefined),
    });
  });

  beforeAll(() => {
    try {
      getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch (error) {
      if (!(error instanceof Error) || !isTestEnvironmentAlreadyInitialized(error)) {
        throw error;
      }
    }
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  function configureStore(
    service: Partial<ProductCatalogService>,
    uploadService: Partial<ReviewMediaUploadService> = {
      uploadReviewImage: () => of('uploads/reviews/user-1/image.webp'),
      uploadReviewVideo: () => of('uploads/reviews/user-1/videos/video.mp4'),
    }
  ): InstanceType<typeof ProductDetailStore> {
    TestBed.configureTestingModule({
      providers: [
        ProductDetailStore,
        {
          provide: ProductCatalogService,
          useValue: service,
        },
        {
          provide: ReviewMediaUploadService,
          useValue: uploadService,
        },
      ],
    });

    return TestBed.inject(ProductDetailStore);
  }

  it('loads product details, reviews, related products, and quantity boundaries', () => {
    const store = configureStore({
      getProductDetail: () => of(product),
      getProductReviews: () => of([createReview('r1', 4)]),
    });

    store.loadProduct('product-1');
    store.incrementQuantity();
    store.incrementQuantity();

    expect(store.loading()).toBe(false);
    expect(store.product()?.slug).toBe('product-1');
    expect(store.product()?.reviews.length).toBe(1);
    expect(store.relatedProducts()[0].id).toBe('product-2');
    expect(store.selectedVariantId()).toBe('variant-1');
    expect(store.selectedPrice()).toBe(90);
    expect(store.quantity()).toBe(2);
    expect(store.canIncrement()).toBe(false);
    expect(store.canDecrement()).toBe(true);
  });

  it('selects variants and resets quantity to the selected stock boundary', () => {
    const store = configureStore({
      getProductDetail: () => of(product),
      getProductReviews: () => of([]),
    });

    store.loadProduct('product-1');
    store.selectVariant('variant-2');
    store.incrementQuantity();
    store.incrementQuantity();
    store.incrementQuantity();

    expect(store.selectedVariantId()).toBe('variant-2');
    expect(store.selectedPrice()).toBe(120);
    expect(store.selectedOriginalPrice()).toBeUndefined();
    expect(store.quantity()).toBe(4);
    expect(store.canIncrement()).toBe(false);
  });

  it('validates review drafts before submitting', () => {
    const store = configureStore({
      getProductDetail: () => of(product),
      getProductReviews: () => of([]),
      addProductReview: () => of(createReview('r2', 5)),
    });

    store.loadProduct('product-1');
    store.submitReview();

    expect(store.reviewFormError()?.rating).toBeTruthy();
    expect(store.reviewFormError()?.comment).toBeTruthy();
    expect(store.reviewSubmitting()).toBe(false);
  });

  it('adds submitted reviews and recalculates rating', () => {
    const store = configureStore({
      getProductDetail: () => of(product),
      getProductReviews: () => of([createReview('r1', 4)]),
      addProductReview: () => of(createReview('r2', 5)),
    });

    store.loadProduct('product-1');
    store.updateReviewDraft({
      reviewerName: 'Alex',
      rating: 5,
      title: 'Great',
      comment: 'Works well',
      imageKeys: ['uploads/reviews/user-1/review.webp'],
    });
    store.submitReview();

    expect(store.reviewModalOpen()).toBe(false);
    expect(store.product()?.reviewCount).toBe(2);
    expect(store.rating()).toBe(4.5);
  });

  it('keeps selected review images local until submit, then uploads and sends image keys', () => {
    const uploadReviewImage = vi.fn(() => of('uploads/reviews/user-1/image.webp'));
    const addProductReview = vi.fn(() => of(createReview('r2', 5)));
    const store = configureStore(
      {
        getProductDetail: () => of(product),
        getProductReviews: () => of([]),
        addProductReview,
      },
      { uploadReviewImage }
    );
    const file = new File(['image'], 'review.webp', { type: 'image/webp' });

    store.loadProduct('product-1');
    store.selectReviewImages([file]);

    expect(store.reviewImages()[0]).toMatchObject({
      fileName: 'review.webp',
      status: 'pending',
    });
    expect(uploadReviewImage).not.toHaveBeenCalled();
    expect(store.reviewDraft().imageKeys).toBeUndefined();

    store.updateReviewDraft({
      rating: 5,
      comment: 'Works well',
    });
    store.submitReview();

    expect(uploadReviewImage).toHaveBeenCalledWith(file);
    expect(addProductReview).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        imageKeys: ['uploads/reviews/user-1/image.webp'],
      })
    );
    expect(store.reviewImages()).toEqual([]);
  });

  it('keeps selected review video local until submit, then uploads and sends video key', () => {
    const uploadReviewVideo = vi.fn(() => of('uploads/reviews/user-1/videos/video.mp4'));
    const addProductReview = vi.fn(() => of(createReview('r2', 5)));
    const store = configureStore(
      {
        getProductDetail: () => of(product),
        getProductReviews: () => of([]),
        addProductReview,
      },
      { uploadReviewVideo }
    );
    const file = new File(['video'], 'review.mp4', { type: 'video/mp4' });

    store.loadProduct('product-1');
    store.selectReviewVideo(file);

    expect(store.reviewVideo()).toMatchObject({
      fileName: 'review.mp4',
      status: 'pending',
    });
    expect(uploadReviewVideo).not.toHaveBeenCalled();
    expect(store.reviewDraft().videoKey).toBeUndefined();

    store.updateReviewDraft({
      rating: 5,
      comment: 'Works well',
    });
    store.submitReview();

    expect(uploadReviewVideo).toHaveBeenCalledWith(file);
    expect(addProductReview).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        videoKey: 'uploads/reviews/user-1/videos/video.mp4',
      })
    );
    expect(store.reviewVideo()).toBeNull();
  });

  it('rejects invalid review image files before upload', () => {
    const uploadReviewImage = vi.fn(() => of('uploads/reviews/user-1/image.webp'));
    const store = configureStore(
      {
        getProductDetail: () => of(product),
        getProductReviews: () => of([]),
      },
      { uploadReviewImage }
    );
    const file = new File(['document'], 'review.pdf', { type: 'application/pdf' });

    store.loadProduct('product-1');
    store.selectReviewImages([file]);

    expect(store.reviewImages()).toEqual([]);
    expect(store.reviewFormError()?.submit).toBeTruthy();
    expect(uploadReviewImage).not.toHaveBeenCalled();
  });

  it('blocks submit while an image upload has failed', () => {
    const addProductReview = vi.fn(() => of(createReview('r2', 5)));
    const store = configureStore(
      {
        getProductDetail: () => of(product),
        getProductReviews: () => of([]),
        addProductReview,
      },
      {
        uploadReviewImage: () => throwError(() => new Error('Upload failed')),
      }
    );
    const file = new File(['image'], 'review.webp', { type: 'image/webp' });

    store.loadProduct('product-1');
    store.updateReviewDraft({
      rating: 5,
      comment: 'Works well',
    });
    store.selectReviewImages([file]);
    store.submitReview();

    expect(store.reviewImages()[0].status).toBe('failed');
    expect(store.reviewFormError()?.submit).toBeTruthy();
    expect(addProductReview).not.toHaveBeenCalled();
  });
});

function createReview(id: string, rating: number): ProductReview {
  return {
    id,
    reviewerName: 'Alex',
    rating,
    title: 'Customer review',
    comment: 'Works well',
    createdAt: '2026-04-26T00:00:00.000Z',
    isOwner: false,
    imageKeys: [],
    imageUrls: [],
  };
}

function isTestEnvironmentAlreadyInitialized(error: Error): boolean {
  return (
    error.message.includes('already been initialized') ||
    error.message.includes('already been called')
  );
}
