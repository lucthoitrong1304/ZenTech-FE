import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProductCatalogService } from '../../../product-catalog/data-access/services/product-catalog.service';
import { ProductCategory } from '../models/product-category.model';
import { ProductListItem } from '../models/product-list-item.model';
import { ProductListingStore } from './product-listing.store';

describe('ProductListingStore', () => {
  const category: ProductCategory = {
    slug: 'keyboards',
    label: 'Keyboards',
    subtitle: 'Precision',
    description: 'Input gear',
    heroImage: '/hero.webp',
  };

  const products: ProductListItem[] = [
    createProduct('b', 'Beta', 200),
    createProduct('a', 'Alpha', 100),
  ];

  function configureStore(service: Partial<ProductCatalogService>): InstanceType<typeof ProductListingStore> {
    TestBed.configureTestingModule({
      providers: [
        ProductListingStore,
        {
          provide: ProductCatalogService,
          useValue: service,
        },
      ],
    });

    return TestBed.inject(ProductListingStore);
  }

  it('loads a category and derives sorted products with computed state', () => {
    const store = configureStore({
      getCategoryListing: () => of({ category, products }),
    });

    store.loadCategory('keyboards');
    store.setSort('price-asc');

    expect(store.loading()).toBe(false);
    expect(store.category()?.slug).toBe('keyboards');
    expect(store.isEmpty()).toBe(false);
    expect(store.sortedProducts().map(product => product.slug)).toEqual(['a', 'b']);
  });

  it('marks invalid categories without duplicating derived empty state', () => {
    const store = configureStore({
      getCategoryListing: () => throwError(() => new Error('PRODUCT_CATEGORY_NOT_FOUND')),
    });

    store.loadCategory('missing');

    expect(store.loading()).toBe(false);
    expect(store.category()).toBeNull();
    expect(store.isInvalidCategory()).toBe(true);
    expect(store.sortedProducts()).toEqual([]);
  });
});

function createProduct(slug: string, name: string, price: number): ProductListItem {
  return {
    id: slug,
    categorySlug: 'keyboards',
    slug,
    name,
    image: `/${slug}.webp`,
    price,
    inStock: true,
  };
}
