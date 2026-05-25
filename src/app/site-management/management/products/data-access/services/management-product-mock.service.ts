import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import {
  ManagementProduct,
  ManagementProductCategory,
  ManagementProductGroup,
  ManagementProductGroupDraft,
  ManagementProductGroupPage,
  ManagementProductGroupQuery,
  ManagementProductOption,
  ManagementProductPage,
  ManagementProductQuery,
  ManagementProductStats,
} from '../models/management-product.models';

const PRODUCT_CATEGORIES: ManagementProductCategory[] = [
  { categoryId: 'keyboards', name: 'Ban phim' },
  { categoryId: 'mice', name: 'Chuot' },
  { categoryId: 'headsets', name: 'Tai nghe' },
  { categoryId: 'monitors', name: 'Man hinh' },
  { categoryId: 'accessories', name: 'Phu kien' },
];

const MOCK_PRODUCTS: ManagementProduct[] = [
  {
    productId: 'product-k1',
    name: 'Ban phim co ZenTech Pro K1',
    sku: 'ZT-K1-RGB',
    categoryId: 'keyboards',
    categoryName: 'Ban phim',
    price: 2490000,
    stock: 45,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCaQXrMjxSTAazMlFoQ36wCW17E5GRGS-2UxBwIxha8J-uRJdrPx_ZmlarS4WDAjLB33Xke73NQSPBTkq5XEAIWw7ZTycqakKskVBVgA31UbquSIodOqmhBr41gcRXtNpF4oH_En72wXmLpRrwRMUvNaV7lLLMLRNTc0HjSSWKu-vV7gaZ5FOlH146Bzkw7Ofys1ulaQcGXLJ4oBTpgvLO15w4pIYZBc0KoPvlShnDoWILMas_ngaLOvUwcsSOQtCyd3NT-DwLO6TE',
    status: 'IN_STOCK',
  },
  {
    productId: 'product-m2',
    name: 'Chuot khong day ZenTech Flow',
    sku: 'ZT-M2-FLOW',
    categoryId: 'mice',
    categoryName: 'Chuot',
    price: 890000,
    stock: 0,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA8BHwGFps5rmuHjOvMgF8cIGhvivef_Rs9wr2uUp4yVGzahNNF0hwtc1vo293rM7w9HETdqpoivxSc9p-04Iap89XfFvWq6Mcq5ohEdnHYiykcNcyTzccFFbcIhJ1HKu-A4TkF7IYFNDMVfeqEPPbHYECsGyCLFAYdWEhBICuH9CGu6H6PQ5ZIk3HCAlXx_D7cV-OfnSZNrzrLru34RsKM7zPkkp7Q_rIHOB5UYOKKU7IXVnBZsXC81ltxZBGdWGfmglNTMSicas8',
    status: 'OUT_OF_STOCK',
  },
  {
    productId: 'product-h4',
    name: 'Tai nghe chong on ZenQuiet Gen 2',
    sku: 'ZT-H4-QUIET',
    categoryId: 'headsets',
    categoryName: 'Tai nghe',
    price: 5200000,
    stock: 5,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCe0Zo-5E2E7FY_PYw7JIklCyah8UgJW8CMRTWhX937tH6mQxRlhGmbrp0kQ-G1VVkOvgVmjZRJogCwCGCDmLNiUOKMULd89IrnPTQH3bpUJpCs-mV4QNZrUJpNCKtpBBCOaVnEYaOZKmv_pCuvibTc7aNjUtH4c9MDFArR0fUcGPQa-BEEEqbfgJT0vm7Xosz1G9v0pMPSJNRuSymTnb4STm8lb9I_h8jTZI4Ql_ZR4Uo0JndWhwEQSEFF4kh9TKhZ7pDBQ46b6cQ',
    status: 'LOW_STOCK',
  },
  {
    productId: 'product-v60',
    name: 'V60 Pro Keyboard',
    sku: 'ZT-V60-HE',
    categoryId: 'keyboards',
    categoryName: 'Ban phim',
    price: 3500000,
    stock: 18,
    imageUrl: null,
    status: 'IN_STOCK',
  },
  {
    productId: 'product-display',
    name: 'ZenDisplay Ultra',
    sku: 'ZT-D27-ULTRA',
    categoryId: 'monitors',
    categoryName: 'Man hinh',
    price: 6250000,
    stock: 24,
    imageUrl: null,
    status: 'IN_STOCK',
  },
  {
    productId: 'product-cable',
    name: 'Cap sac USB-C 100W',
    sku: 'ZT-C100W',
    categoryId: 'accessories',
    categoryName: 'Phu kien',
    price: 120000,
    stock: 8,
    imageUrl: null,
    status: 'LOW_STOCK',
  },
];

const MOCK_GROUPS: ManagementProductGroup[] = [
  {
    groupId: 'group-keyboards',
    name: 'Ban phim co',
    iconName: 'keyboard',
    productIds: ['product-k1', 'product-v60'],
    productCount: 142,
    active: true,
  },
  {
    groupId: 'group-mice',
    name: 'Chuot Gaming',
    iconName: 'mouse',
    productIds: ['product-m2'],
    productCount: 89,
    active: true,
  },
  {
    groupId: 'group-headsets',
    name: 'Tai nghe',
    iconName: 'headphones',
    productIds: ['product-h4'],
    productCount: 56,
    active: false,
  },
  {
    groupId: 'group-monitors',
    name: 'Man hinh',
    iconName: 'monitor',
    productIds: ['product-display'],
    productCount: 24,
    active: true,
  },
];

@Injectable({
  providedIn: 'root',
})
export class ManagementProductMockService {
  private products = [...MOCK_PRODUCTS];
  private groups = [...MOCK_GROUPS];

  getCategories(): Observable<ManagementProductCategory[]> {
    return of([...PRODUCT_CATEGORIES]);
  }

  getProducts(query: ManagementProductQuery): Observable<ManagementProductPage> {
    const filtered = this.filterProducts(this.products, query);
    const sorted = this.sortProducts(filtered, query.sort);
    const start = query.page * query.size;
    const pageProducts = sorted.slice(start, start + query.size);
    const totalPages = Math.ceil(sorted.length / query.size);

    return of({
      products: pageProducts,
      page: query.page,
      size: query.size,
      totalElements: sorted.length,
      totalPages,
      last: totalPages === 0 || query.page + 1 >= totalPages,
    });
  }

  getProductStats(): Observable<ManagementProductStats> {
    const inventoryValue = this.products.reduce(
      (total, product) => total + product.price * product.stock,
      0
    );

    return of({
      totalProducts: this.products.length,
      outOfStock: this.products.filter(product => product.status === 'OUT_OF_STOCK').length,
      inventoryValue,
      lowStock: this.products.filter(product => product.status === 'LOW_STOCK').length,
    });
  }

  deleteProduct(productId: string): Observable<string> {
    if (!this.products.some(product => product.productId === productId)) {
      return throwError(() => new Error('Product not found.'));
    }

    this.products = this.products.filter(product => product.productId !== productId);
    this.groups = this.groups.map(group => {
      const productIds = group.productIds.filter(id => id !== productId);

      return {
        ...group,
        productIds,
        productCount: Math.max(0, group.productCount - (productIds.length === group.productIds.length ? 0 : 1)),
      };
    });

    return of(productId);
  }

  getProductGroups(query: ManagementProductGroupQuery): Observable<ManagementProductGroupPage> {
    const filtered = this.filterGroups(this.groups, query);
    const sorted = this.sortGroups(filtered, query.sort);
    const start = query.page * query.size;
    const pageGroups = sorted.slice(start, start + query.size);
    const totalPages = Math.ceil(sorted.length / query.size);

    return of({
      groups: pageGroups,
      page: query.page,
      size: query.size,
      totalElements: sorted.length,
      totalPages,
      last: totalPages === 0 || query.page + 1 >= totalPages,
    });
  }

  getProductOptions(): Observable<ManagementProductOption[]> {
    return of(
      this.products.map(product => ({
        productId: product.productId,
        name: product.name,
        sku: product.sku,
        categoryName: product.categoryName,
      }))
    );
  }

  createProductGroup(draft: ManagementProductGroupDraft): Observable<ManagementProductGroup> {
    const group: ManagementProductGroup = {
      groupId: `group-${Date.now()}`,
      name: draft.name.trim(),
      iconName: 'package',
      productIds: [...draft.productIds],
      productCount: draft.productIds.length,
      active: draft.active,
    };

    this.groups = [group, ...this.groups];

    return of(group);
  }

  updateProductGroup(draft: ManagementProductGroupDraft): Observable<ManagementProductGroup> {
    if (!draft.groupId) {
      return throwError(() => new Error('Group id is required.'));
    }

    const group = this.groups.find(item => item.groupId === draft.groupId);

    if (!group) {
      return throwError(() => new Error('Group not found.'));
    }

    const updated: ManagementProductGroup = {
      ...group,
      name: draft.name.trim(),
      productIds: [...draft.productIds],
      productCount: draft.productIds.length,
      active: draft.active,
    };

    this.groups = this.groups.map(item => (item.groupId === updated.groupId ? updated : item));

    return of(updated);
  }

  deleteProductGroup(groupId: string): Observable<string> {
    if (!this.groups.some(group => group.groupId === groupId)) {
      return throwError(() => new Error('Group not found.'));
    }

    this.groups = this.groups.filter(group => group.groupId !== groupId);

    return of(groupId);
  }

  private filterProducts(
    products: ManagementProduct[],
    query: ManagementProductQuery
  ): ManagementProduct[] {
    const keyword = query.keyword.trim().toLowerCase();

    return products.filter(product => {
      const matchesKeyword =
        !keyword ||
        product.name.toLowerCase().includes(keyword) ||
        product.sku.toLowerCase().includes(keyword);
      const matchesCategory = query.categoryId === 'all' || product.categoryId === query.categoryId;
      const matchesStatus =
        query.stockStatus === 'all' || product.status === query.stockStatus;

      return matchesKeyword && matchesCategory && matchesStatus;
    });
  }

  private sortProducts(
    products: ManagementProduct[],
    sort: ManagementProductQuery['sort']
  ): ManagementProduct[] {
    return [...products].sort((left, right) => {
      switch (sort) {
        case 'price,desc':
          return right.price - left.price;
        case 'price,asc':
          return left.price - right.price;
        case 'stock,asc':
          return left.stock - right.stock;
        case 'name,asc':
        default:
          return left.name.localeCompare(right.name);
      }
    });
  }

  private filterGroups(
    groups: ManagementProductGroup[],
    query: ManagementProductGroupQuery
  ): ManagementProductGroup[] {
    const keyword = query.keyword.trim().toLowerCase();

    return groups.filter(group => {
      const matchesKeyword = !keyword || group.name.toLowerCase().includes(keyword);
      const matchesActive =
        query.activeFilter === 'all' ||
        (query.activeFilter === 'active' ? group.active : !group.active);

      return matchesKeyword && matchesActive;
    });
  }

  private sortGroups(
    groups: ManagementProductGroup[],
    sort: ManagementProductGroupQuery['sort']
  ): ManagementProductGroup[] {
    return [...groups].sort((left, right) => {
      switch (sort) {
        case 'productCount,desc':
          return right.productCount - left.productCount;
        case 'productCount,asc':
          return left.productCount - right.productCount;
        case 'name,asc':
        default:
          return left.name.localeCompare(right.name);
      }
    });
  }
}
