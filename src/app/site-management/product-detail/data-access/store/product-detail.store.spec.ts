import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  ProductCategory,
  ProductDetail,
  ProductReview,
} from '../../../product-catalog/data-access/models/product-catalog.models';
import { ProductCatalogService } from '../../../product-catalog/data-access/services/product-catalog.service';
import { ProductDetailStore } from './product-detail.store';

describe('ProductDetailStore', () => {
  const category: ProductCategory = {
    slug: 'keyboards',
    label: 'Keyboards',
    subtitle: 'Precision',
    description: 'Input gear',
    heroImage: '/hero.webp',
  };

  const product: ProductDetail = {
    id: 'p1',
    categorySlug: 'keyboards',
    slug: 'alpha',
    name: 'Alpha',
    image: '/alpha.webp',
    price: 100,
    rating: 4,
    reviewCount: 1,
    inStock: true,
    category,
    gallery: ['/alpha.webp'],
    description: 'A test product',
    highlights: ['Fast'],
    specs: [{ label: 'Layout', value: 'TKL' }],
    maxQuantity: 2,
    reviews: [createReview('r1', 4)],
    relatedProductSlugs: [],
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

  it('loads product details and derives quantity boundaries', () => {
    const store = configureStore({
      getProductDetail: () => of(product),
      getRelatedProducts: () => [],
    });

    store.loadProduct('alpha');
    store.incrementQuantity();
    store.incrementQuantity();

    expect(store.loading()).toBe(false);
    expect(store.product()?.slug).toBe('alpha');
    expect(store.quantity()).toBe(2);
    expect(store.canIncrement()).toBe(false);
    expect(store.canDecrement()).toBe(true);
  });

  it('validates review drafts before submitting', () => {
    const store = configureStore({
      getProductDetail: () => of(product),
      getRelatedProducts: () => [],
      addProductReview: () => of(createReview('r2', 5)),
    });

    store.loadProduct('alpha');
    store.submitReview();

    expect(store.reviewFormError()?.rating).toBeTruthy();
    expect(store.reviewSubmitting()).toBe(false);
  });

  it('adds submitted reviews and recalculates rating', () => {
    const store = configureStore({
      getProductDetail: () => of(product),
      getRelatedProducts: () => [],
      addProductReview: () => of(createReview('r2', 5)),
    });

    store.loadProduct('alpha');
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
    title: 'Great',
    comment: 'Works well',
    createdAt: '2026-04-26T00:00:00.000Z',
  };
}
