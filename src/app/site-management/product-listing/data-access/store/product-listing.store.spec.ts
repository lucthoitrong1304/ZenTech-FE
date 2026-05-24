import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import {
  PRODUCT_CATEGORY_NOT_FOUND,
  ProductCatalogService,
} from '../../../product-catalog/data-access/services/product-catalog.service';
import { CategoryNavigationStore } from '../../../shared/data-access/store/category-navigation.store';
import { ProductCategory } from '../models/product-category.model';
import { ProductListItem } from '../models/product-list-item.model';
import { ProductListingStore } from './product-listing.store';

const category: ProductCategory = {
  id: 'category-1',
  slug: 'keyboards',
  label: 'Keyboards',
};

describe('ProductListingStore', () => {
  const firstPageProducts: ProductListItem[] = [createProduct('a', 'Alpha', 100)];
  const secondPageProducts: ProductListItem[] = [createProduct('b', 'Beta', 200)];

  function configureStore(options: {
    productCatalogService: Partial<ProductCatalogService>;
    categoryNavigationStore: Partial<InstanceType<typeof CategoryNavigationStore>>;
  }): InstanceType<typeof ProductListingStore> {
    TestBed.configureTestingModule({
      providers: [
        ProductListingStore,
        {
          provide: ProductCatalogService,
          useValue: options.productCatalogService,
        },
        {
          provide: CategoryNavigationStore,
          useValue: options.categoryNavigationStore,
        },
      ],
    });

    return TestBed.inject(ProductListingStore);
  }

  it('resolves category from navigation cache and loads first product page', () => {
    const getCategoryListing = vi.fn(() =>
      of(createListing({ products: firstPageProducts, page: 0, hasNext: true }))
    );
    const resolveCategoryBySlug = vi.fn(() => of(category));
    const store = configureStore({
      productCatalogService: { getCategoryListing },
      categoryNavigationStore: {
        resolveCategoryBySlug,
        findCategoryBySlug: () => category,
      },
    });

    store.loadCategory({ slug: 'keyboards', sortBy: 'featured' });

    expect(resolveCategoryBySlug).toHaveBeenCalledWith('keyboards');
    expect(getCategoryListing).toHaveBeenCalledWith(category, {
      page: 0,
      size: 10,
      sort: 'NEWEST',
    });
    expect(store.loading()).toBe(false);
    expect(store.category()?.id).toBe('category-1');
    expect(store.sortedProducts().map(product => product.slug)).toEqual(['a']);
    expect(store.hasNext()).toBe(true);
  });

  it('marks invalid categories without loading products', () => {
    const getCategoryListing = vi.fn();
    const store = configureStore({
      productCatalogService: { getCategoryListing },
      categoryNavigationStore: {
        resolveCategoryBySlug: () => throwError(() => new Error(PRODUCT_CATEGORY_NOT_FOUND)),
        findCategoryBySlug: () => null,
      },
    });

    store.loadCategory({ slug: 'missing', sortBy: 'featured' });

    expect(getCategoryListing).not.toHaveBeenCalled();
    expect(store.loading()).toBe(false);
    expect(store.category()).toBeNull();
    expect(store.isInvalidCategory()).toBe(true);
    expect(store.sortedProducts()).toEqual([]);
  });

  it('loads more products using the cached category without resolving all categories again', () => {
    const getCategoryListing = vi
      .fn()
      .mockReturnValueOnce(of(createListing({ products: firstPageProducts, page: 0, hasNext: true })))
      .mockReturnValueOnce(
        of(createListing({ products: secondPageProducts, page: 1, hasNext: false }))
      );
    const resolveCategoryBySlug = vi.fn(() => of(category));
    const findCategoryBySlug = vi.fn(() => category);
    const store = configureStore({
      productCatalogService: { getCategoryListing },
      categoryNavigationStore: {
        resolveCategoryBySlug,
        findCategoryBySlug,
      },
    });

    store.loadCategory({ slug: 'keyboards', sortBy: 'featured' });
    store.loadMore();

    expect(resolveCategoryBySlug).toHaveBeenCalledTimes(1);
    expect(findCategoryBySlug).toHaveBeenCalledWith('keyboards');
    expect(getCategoryListing).toHaveBeenCalledWith(category, {
      page: 1,
      size: 10,
      sort: 'NEWEST',
    });
    expect(store.sortedProducts().map(product => product.slug)).toEqual(['a', 'b']);
    expect(store.hasNext()).toBe(false);
  });

  it('reloads the first page when sort changes', () => {
    const getCategoryListing = vi
      .fn()
      .mockReturnValueOnce(of(createListing({ products: firstPageProducts, page: 0, hasNext: true })))
      .mockReturnValueOnce(
        of(createListing({ products: secondPageProducts, page: 0, hasNext: false }))
      );
    const store = configureStore({
      productCatalogService: { getCategoryListing },
      categoryNavigationStore: {
        resolveCategoryBySlug: () => of(category),
        findCategoryBySlug: () => category,
      },
    });

    store.loadCategory({ slug: 'keyboards', sortBy: 'featured' });
    store.setSort('price-desc');
    store.loadCategory({ slug: 'keyboards', sortBy: 'price-desc' });

    expect(getCategoryListing).toHaveBeenLastCalledWith(category, {
      page: 0,
      size: 10,
      sort: 'PRICE_DESC',
    });
    expect(store.sortedProducts().map(product => product.slug)).toEqual(['b']);
    expect(store.page()).toBe(0);
    expect(store.hasNext()).toBe(false);
  });
});

function createListing(options: {
  products: ProductListItem[];
  page: number;
  hasNext: boolean;
}) {
  return {
    category,
    products: options.products,
    page: options.page,
    size: 10,
    totalItems: 2,
    totalPages: 2,
    hasNext: options.hasNext,
    hasPrevious: options.page > 0,
  };
}

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
