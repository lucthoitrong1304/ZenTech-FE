import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import {
  ManagementProduct,
  ManagementProductPage,
  ManagementProductQuery,
  ProductCreateRequest,
  ProductManagementDetailResponse,
} from '../models/management-product.models';
import { ManagementProductService } from '../services/management-product.service';
import { ManagementProductsStore } from './management-products.store';

describe('ManagementProductsStore', () => {
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
  });

  function configureStore(
    productService: Partial<ManagementProductService>
  ): InstanceType<typeof ManagementProductsStore> {
    TestBed.configureTestingModule({
      providers: [
        ManagementProductsStore,
        {
          provide: ManagementProductService,
          useValue: productService,
        },
      ],
    });

    return TestBed.inject(ManagementProductsStore);
  }

  it('loads products, categories, and stats', () => {
    const product = createProduct();
    const getProducts = vi.fn((query: ManagementProductQuery) => of(createPage([product], query)));
    const store = configureStore({
      getProducts,
      getProductStats: () =>
        of({
          totalProducts: 1,
          outOfStock: 0,
          inventoryValue: 2490000,
          lowStock: 0,
        }),
      getCategories: () => of([{ categoryId: 'keyboards', name: 'Bàn phím' }]),
    });

    store.loadProducts();

    expect(getProducts).toHaveBeenCalledWith({
      page: 0,
      size: 4,
      sort: 'name,asc',
      keyword: '',
      categoryId: 'all',
      stockStatus: 'all',
    });
    expect(store.products()[0].productId).toBe(product.productId);
    expect(store.categories()[0].categoryId).toBe('keyboards');
    expect(store.stats().inventoryValue).toBe(2490000);
  });

  it('resets to page zero when filters change', () => {
    const store = configureStore({
      getProducts: query => of(createPage([createProduct()], query, 12)),
      getProductStats: () =>
        of({
          totalProducts: 1,
          outOfStock: 0,
          inventoryValue: 2490000,
          lowStock: 0,
        }),
      getCategories: () => of([]),
    });

    store.loadProducts();
    store.goToPage(2);
    store.setKeyword('keyboard');
    store.setStockFilter('IN_STOCK');

    expect(store.query()).toEqual({
      page: 0,
      size: 4,
      sort: 'name,asc',
      keyword: 'keyboard',
      categoryId: 'all',
      stockStatus: 'IN_STOCK',
    });
    expect(store.activeFilterCount()).toBe(2);
  });

  it('removes a product after delete succeeds', () => {
    const product = createProduct();
    const store = configureStore({
      getProducts: query => of(createPage([product], query)),
      getProductStats: () =>
        of({
          totalProducts: 1,
          outOfStock: 0,
          inventoryValue: 2490000,
          lowStock: 0,
        }),
      getCategories: () => of([]),
      deleteProduct: productId => of(productId),
    });

    store.loadProducts();
    store.deleteProduct(product.productId);

    expect(store.products()).toEqual([]);
    expect(store.successMessage()).toBe('Đã xóa sản phẩm mock khỏi danh sách.');
  });

  it('stores load failures', () => {
    const store = configureStore({
      getProducts: () => throwError(() => new Error('Network failed')),
      getProductStats: () =>
        of({
          totalProducts: 0,
          outOfStock: 0,
          inventoryValue: 0,
          lowStock: 0,
        }),
      getCategories: () => of([]),
    });

    store.loadProducts();

    expect(store.loading()).toBe(false);
    expect(store.errorMessage()).toBe(
      'Không thể tải danh sách sản phẩm. Vui lòng thử lại.'
    );
  });

  it('preserves markdown rich fields and normalizes empty rich fields on create', () => {
    const product = createProduct();
    const detail = createProductDetail();
    const createProductSpy = vi.fn((request: ProductCreateRequest) => of(detail));
    const store = configureStore({
      getProducts: query => of(createPage([product], query)),
      getProductStats: () =>
        of({
          totalProducts: 1,
          outOfStock: 0,
          inventoryValue: 2490000,
          lowStock: 0,
        }),
      getCategories: () => of([]),
      createProduct: createProductSpy,
    });

    store.openCreateDialog();
    store.updateFormValue({
      productName: 'ZenTech Editor Test',
      categoryIds: ['keyboards'],
      imageKeys: [],
      specificationsRaw: '# Specs\n\n**Hall Effect**',
      compatibilityRaw: '   ',
      boxContentsRaw: '- Cable\n- Puller',
      supportInfoRaw: '',
      variants: [
        {
          originalPrice: 2490000,
          salePrice: null,
          name: 'US Plug',
          nameColor: 'GunMetal',
          colorCode: '#5A5A5A',
          stockQuantity: 50,
        },
      ],
    });

    store.submitProductForm();

    expect(createProductSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        specifications: '# Specs\n\n**Hall Effect**',
        compatibility: null,
        boxContents: '- Cable\n- Puller',
        supportInfo: null,
      })
    );
  });
});

function isTestEnvironmentAlreadyInitialized(error: Error): boolean {
  return (
    error.message.includes('already been initialized') ||
    error.message.includes('already been called')
  );
}

function createProduct(): ManagementProduct {
  return {
    productId: 'product-k1',
    name: 'Bàn phím cơ ZenTech Pro K1',
    sku: 'ZT-K1-RGB',
    categoryId: 'keyboards',
    categoryName: 'Bàn phím',
    price: 2490000,
    stock: 45,
    imageUrl: null,
    status: 'IN_STOCK',
  };
}

function createProductDetail(): ProductManagementDetailResponse {
  return {
    id: 'product-k1',
    productName: 'ZenTech Editor Test',
    specifications: '# Specs\n\n**Hall Effect**',
    compatibility: null,
    boxContents: '- Cable\n- Puller',
    supportInfo: null,
    representativeImageKey: null,
    representativeImageUrl: null,
    imageKeys: [],
    productImageUrls: [],
    productGroup: null,
    categories: [],
    variants: [],
    deleted: false,
    createdAt: '2026-06-25T00:00:00Z',
    updatedAt: '2026-06-25T00:00:00Z',
    deletedAt: null,
  };
}

function createPage(
  products: ManagementProduct[],
  query: ManagementProductQuery,
  totalElements = products.length
): ManagementProductPage {
  return {
    products,
    page: query.page,
    size: query.size,
    totalElements,
    totalPages: Math.ceil(totalElements / query.size),
    last: query.page + 1 >= Math.ceil(totalElements / query.size),
  };
}
