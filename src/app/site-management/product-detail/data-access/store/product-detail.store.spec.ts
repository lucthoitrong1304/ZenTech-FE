import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  ProductDetail,
  ProductReview,
} from '../../../product-catalog/data-access/models/product-catalog.models';
import { ProductCatalogService } from '../../../product-catalog/data-access/services/product-catalog.service';
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
    description: 'A test product',
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

  function configureStore(service: Partial<ProductCatalogService>): InstanceType<typeof ProductDetailStore> {
    TestBed.configureTestingModule({
      providers: [
        ProductDetailStore,
        {
          provide: ProductCatalogService,
          useValue: service,
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
    });
    store.submitReview();

    expect(store.reviewModalOpen()).toBe(false);
    expect(store.product()?.reviewCount).toBe(2);
    expect(store.rating()).toBe(4.5);
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
  };
}
