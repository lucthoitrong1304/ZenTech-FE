import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '../../../../../environments/environment';
import { ApiService } from '../../../../core/api/api.service';
import { ProductCategory } from '../models/product-catalog.models';
import { PRODUCT_CATEGORY_NOT_FOUND, ProductCatalogService } from './product-catalog.service';

describe('ProductCatalogService', () => {
  const categoriesUrl = `${environment.apiBaseUrl}/categories`;
  const productsUrl = `${environment.apiBaseUrl}/products`;

  beforeAll(() => {
    try {
      getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('already been initialized')) {
        throw error;
      }
    }
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function configureService(api: object): ProductCatalogService {
    TestBed.configureTestingModule({
      providers: [
        ProductCatalogService,
        {
          provide: ApiService,
          useValue: api,
        },
      ],
    });

    return TestBed.inject(ProductCatalogService);
  }

  it('loads category tree and maps parent/child slugs', async () => {
    const get = vi.fn(() =>
      of([
        {
          id: 'root-1',
          categoryName: 'Keyboards',
          shortName: null,
          hasChildren: true,
          children: [
            {
              id: 'child-1',
              categoryName: 'Hall Effect Keyboard',
              shortName: 'HE Keyboard',
              hasChildren: false,
              children: [],
            },
          ],
        },
      ])
    );
    const service = configureService({ get });

    const categories = await firstValueFrom(service.getCategoryTree());

    expect(get).toHaveBeenCalledWith(categoriesUrl);
    expect(categories).toEqual([
      {
        id: 'root-1',
        slug: 'keyboards',
        label: 'Keyboards',
        children: [
          {
            id: 'child-1',
            slug: 'he-keyboard',
            label: 'HE Keyboard',
            children: [],
          },
        ],
      },
    ]);
  });

  it('calls category products endpoint directly and maps products', async () => {
    const get = vi.fn(() =>
      of({
        items: [
          {
            id: 'product-1',
            productName: 'Aero X1',
            imageUrl: 'https://cdn.example.com/aero.webp',
            originalPrice: 120,
            salePrice: 99,
            averageRating: 4.5,
          },
        ],
        page: 0,
        size: 10,
        totalItems: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      })
    );
    const service = configureService({ get });
    const category: ProductCategory = {
      id: 'category-1',
      slug: 'mice',
      label: 'Mice',
    };

    const listing = await firstValueFrom(
      service.getCategoryListing(category, { page: 0, size: 10, sort: 'PRICE_ASC' })
    );

    expect(get).toHaveBeenCalledWith(`${categoriesUrl}/category-1/products`, {
      params: {
        page: 0,
        size: 10,
        sort: 'PRICE_ASC',
      },
    });
    expect(listing.products[0]).toEqual({
      id: 'product-1',
      categorySlug: 'mice',
      slug: 'product-1',
      name: 'Aero X1',
      image: 'https://cdn.example.com/aero.webp',
      price: 99,
      originalPrice: 120,
      rating: 4.5,
      inStock: true,
    });
  });

  it('maps product detail response from the real product endpoint', async () => {
    const get = vi.fn(() => of(createProductDetailResponse()));
    const service = configureService({ get });

    const product = await firstValueFrom(service.getProductDetail('product-1'));

    expect(get).toHaveBeenCalledWith(`${productsUrl}/product-1`);
    expect(product).toMatchObject({
      id: 'product-1',
      slug: 'product-1',
      name: 'V60 Pro HE Keyboard',
      description: '## Hall Effect Control\n\nFast magnetic actuation.',
      image: 'https://cdn.example.com/main.webp',
      price: 339.95,
      originalPrice: 384.85,
      rating: 4.8,
      reviewCount: 154,
      inStock: true,
      maxQuantity: 8,
    });
    expect(product.gallery).toEqual([
      'https://cdn.example.com/main.webp',
      'https://cdn.example.com/side.webp',
    ]);
    expect(product.variants[0]).toEqual({
      id: 'variant-1',
      name: 'Cyberpunk',
      nameColor: 'Cyberpunk',
      colorCode: '#7c3aed',
      originalPrice: 384.85,
      salePrice: 339.95,
      stockQuantity: 8,
    });
    expect(product.specs.map(spec => spec.label)).toEqual([
      'Specifications',
      'Compatibility',
      'Box contents',
      'Support',
    ]);
    expect(product.relatedProducts?.[0]).toMatchObject({
      id: 'similar-1',
      slug: 'similar-1',
      name: 'V60 Pro Mouse',
      price: 80,
    });
  });

  it('loads product reviews and maps customer fields', async () => {
    const get = vi.fn(() =>
      of({
        items: [
          {
            reviewId: 'review-1',
            rating: 5,
            comment: 'Great keyboard.',
            createdAt: '2026-04-20T00:00:00Z',
            updatedAt: null,
            customerId: 'customer-1',
            customerName: 'Alex',
            isOwner: true,
            imageUrls: ['https://cdn.example.com/review-1.webp'],
            videoUrl: 'https://cdn.example.com/review-1.mp4',
          },
        ],
        page: 0,
        size: 5,
        totalItems: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      })
    );
    const service = configureService({ get });

    const reviews = await firstValueFrom(service.getProductReviews('product-1'));

    expect(get).toHaveBeenCalledWith(`${productsUrl}/product-1/reviews`, {
      params: { page: 0, size: 5 },
    });
    expect(reviews[0]).toEqual({
      id: 'review-1',
      reviewerName: 'Alex',
      rating: 5,
      title: 'Customer review',
      comment: 'Great keyboard.',
      createdAt: '2026-04-20T00:00:00Z',
      imageUrls: ['https://cdn.example.com/review-1.webp'],
      videoUrl: 'https://cdn.example.com/review-1.mp4',
    });
  });

  it('posts reviews with review media keys', async () => {
    const post = vi.fn(() =>
      of({
        reviewId: 'review-2',
        rating: 4,
        comment: 'Solid.',
        createdAt: '2026-04-21T00:00:00Z',
        updatedAt: null,
        customerId: 'customer-2',
        customerName: 'Minh',
        isOwner: true,
        imageUrls: [],
        videoUrl: 'https://cdn.example.com/review-2.mp4',
      })
    );
    const service = configureService({ post });

    const review = await firstValueFrom(
      service.addProductReview('product-1', {
        reviewerName: 'Ignored locally',
        rating: 4,
        title: 'Ignored title',
        comment: 'Solid.',
        imageKeys: ['uploads/reviews/customer-2/solid.webp'],
        videoKey: 'uploads/reviews/customer-2/solid.mp4',
      })
    );

    expect(post).toHaveBeenCalledWith(`${productsUrl}/product-1/reviews`, {
      rating: 4,
      comment: 'Solid.',
      imageKeys: ['uploads/reviews/customer-2/solid.webp'],
      videoKey: 'uploads/reviews/customer-2/solid.mp4',
    });
    expect(review.reviewerName).toBe('Minh');
    expect(review.videoUrl).toBe('https://cdn.example.com/review-2.mp4');
  });

  it('throws PRODUCT_CATEGORY_NOT_FOUND when category id is missing', async () => {
    const service = configureService({});

    await expect(
      firstValueFrom(service.getCategoryListing({ slug: 'missing', label: 'Missing' }))
    ).rejects.toThrow(PRODUCT_CATEGORY_NOT_FOUND);
  });
});

function createProductDetailResponse() {
  return {
    id: 'product-1',
    productName: 'V60 Pro HE Keyboard',
    description: '## Hall Effect Control\n\nFast magnetic actuation.',
    specifications: 'Hall Effect switches',
    compatibility: 'Windows and macOS',
    boxContents: 'Keyboard, cable, keycap puller',
    supportInfo: 'One year support',
    createdAt: '2026-04-20T00:00:00Z',
    productImageUrls: ['https://cdn.example.com/main.webp', 'https://cdn.example.com/side.webp'],
    groupProducts: [
      {
        id: 'group-1',
        productName: 'V60 Pro Mouse',
        imageUrl: 'https://cdn.example.com/group.webp',
      },
    ],
    similarProducts: [
      {
        id: 'similar-1',
        productName: 'V60 Pro Mouse',
        imageUrl: 'https://cdn.example.com/similar.webp',
        originalPrice: 80,
        salePrice: null,
        averageRating: 4.4,
      },
    ],
    variants: [
      {
        id: 'variant-1',
        originalPrice: 384.85,
        salePrice: 339.95,
        name: 'Cyberpunk',
        nameColor: 'Cyberpunk',
        colorCode: '#7c3aed',
        saleStartAt: null,
        saleEndAt: null,
        stockQuantity: 8,
      },
    ],
    averageRating: 4.8,
    totalReviews: 154,
  };
}
