import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CartStore } from '../../../cart/data-access/store/cart.store';
import { ProductDetail } from '../../../product-catalog/data-access/models/product-catalog.models';
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
    cartStore?: Partial<InstanceType<typeof CartStore>>;
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
        {
          provide: CartStore,
          useValue: options.cartStore ?? { addItem: vi.fn() },
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

  it('adds the first in-stock product detail variant to cart from listing cards', () => {
    const addItem = vi.fn();
    const detail = createProductDetail();
    const store = configureStore({
      productCatalogService: {
        getProductDetail: vi.fn(() => of(detail)),
      },
      categoryNavigationStore: {
        resolveCategoryBySlug: () => of(category),
        findCategoryBySlug: () => category,
      },
      cartStore: { addItem },
    });

    store.addProductToCart(createProduct('product-1', 'Alpha', 90));

    expect(addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-1',
        productSlug: 'product-1',
        productName: 'Alpha',
        variantId: 'variant-2',
        quantity: 1,
        maxQuantity: 4,
      })
    );
    expect(store.cartSuccessMessage()).toContain('Alpha');
  });

  it('reports a cart warning when product detail has no in-stock variants', () => {
    const addItem = vi.fn();
    const store = configureStore({
      productCatalogService: {
        getProductDetail: vi.fn(() =>
          of({
            ...createProductDetail(),
            variants: [
              {
                id: 'variant-1',
                name: 'Black',
                originalPrice: 100,
                stockQuantity: 0,
              },
            ],
          })
        ),
      },
      categoryNavigationStore: {
        resolveCategoryBySlug: () => of(category),
        findCategoryBySlug: () => category,
      },
      cartStore: { addItem },
    });

    store.addProductToCart(createProduct('product-1', 'Alpha', 90));

    expect(addItem).not.toHaveBeenCalled();
    expect(store.cartErrorMessage()).toBeTruthy();
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

function createProductDetail(): ProductDetail {
  return {
    id: 'product-1',
    categorySlug: 'keyboards',
    slug: 'product-1',
    name: 'Alpha',
    image: '/alpha.webp',
    price: 90,
    originalPrice: 100,
    inStock: true,
    gallery: ['/alpha.webp'],
    description: '',
    highlights: [],
    specs: [],
    maxQuantity: 4,
    reviews: [],
    relatedProductSlugs: [],
    variants: [
      {
        id: 'variant-1',
        name: 'Black',
        originalPrice: 100,
        stockQuantity: 0,
      },
      {
        id: 'variant-2',
        name: 'Silver',
        originalPrice: 100,
        salePrice: 90,
        stockQuantity: 4,
      },
    ],
  };
}
