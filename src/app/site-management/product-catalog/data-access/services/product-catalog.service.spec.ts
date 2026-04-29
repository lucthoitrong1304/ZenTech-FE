import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import { ProductCategory } from '../models/product-catalog.models';
import { PRODUCT_CATEGORY_NOT_FOUND, ProductCatalogService } from './product-catalog.service';

describe('ProductCatalogService', () => {
  const categoriesUrl = `${environment.apiBaseUrl}/categories`;

  function configureService(get: ReturnType<typeof vi.fn>): ProductCatalogService {
    TestBed.configureTestingModule({
      providers: [
        ProductCatalogService,
        {
          provide: ApiService,
          useValue: { get },
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
    const service = configureService(get);

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
    const service = configureService(get);
    const category: ProductCategory = {
      id: 'category-1',
      slug: 'mice',
      label: 'Mice',
    };

    const listing = await firstValueFrom(
      service.getCategoryListing(category, { page: 0, size: 10, sort: 'PRICE_ASC' })
    );

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(`${categoriesUrl}/category-1/products`, {
      params: {
        page: 0,
        size: 10,
        sort: 'PRICE_ASC',
      },
    });
    expect(listing.category).toEqual(category);
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

  it('falls back to image placeholder and original price', async () => {
    const get = vi.fn(() =>
      of({
        items: [
          {
            id: 'product-2',
            productName: 'Zen Speaker',
            imageUrl: '',
            originalPrice: 80,
            salePrice: null,
            averageRating: null,
          },
        ],
        page: 1,
        size: 10,
        totalItems: 11,
        totalPages: 2,
        hasNext: false,
        hasPrevious: true,
      })
    );
    const service = configureService(get);

    const listing = await firstValueFrom(
      service.getCategoryListing(
        { id: 'category-2', slug: 'speakers', label: 'Speakers' },
        { page: 1, size: 10, sort: 'NEWEST' }
      )
    );

    expect(listing.products[0].image).toBe('/home/asset-1.webp');
    expect(listing.products[0].price).toBe(80);
    expect(listing.products[0].originalPrice).toBeUndefined();
    expect(listing.products[0].rating).toBeUndefined();
    expect(listing.page).toBe(1);
    expect(listing.hasPrevious).toBe(true);
  });

  it('throws PRODUCT_CATEGORY_NOT_FOUND when category id is missing', async () => {
    const service = configureService(vi.fn());

    await expect(
      firstValueFrom(
        service.getCategoryListing({ slug: 'missing', label: 'Missing' })
      )
    ).rejects.toThrow(PRODUCT_CATEGORY_NOT_FOUND);
  });
});
