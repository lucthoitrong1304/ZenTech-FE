export type ManagementProductStockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type ManagementProductStockFilter = 'all' | ManagementProductStockStatus;
export type ManagementProductGroupActiveFilter = 'all' | 'active' | 'inactive';
export type ManagementProductSort = 'name,asc' | 'price,desc' | 'price,asc' | 'stock,asc';
export type ManagementProductGroupSort = 'name,asc' | 'productCount,desc' | 'productCount,asc';

export interface ManagementProductCategory {
  categoryId: string;
  name: string;
}

export interface ManagementProduct {
  productId: string;
  name: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  status: ManagementProductStockStatus;
}

export interface ManagementProductGroup {
  groupId: string;
  name: string;
  iconName: string;
  productIds: string[];
  productCount: number;
  active: boolean;
}

export interface ManagementProductOption {
  productId: string;
  name: string;
  sku: string;
  categoryName: string;
}

export interface ManagementProductQuery {
  page: number;
  size: number;
  sort: ManagementProductSort;
  keyword: string;
  categoryId: string;
  stockStatus: ManagementProductStockFilter;
}

export interface ManagementProductGroupQuery {
  page: number;
  size: number;
  sort: ManagementProductGroupSort;
  keyword: string;
  activeFilter: ManagementProductGroupActiveFilter;
}

export interface ManagementProductPage {
  products: ManagementProduct[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ManagementProductGroupPage {
  groups: ManagementProductGroup[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ManagementProductStats {
  totalProducts: number;
  outOfStock: number;
  inventoryValue: number;
  lowStock: number;
}

export interface ManagementProductGroupDraft {
  groupId?: string;
  name: string;
  productIds: string[];
  active: boolean;
}

export interface ManagementProductGroupFormErrors {
  name?: string;
  productIds?: string;
  submit?: string;
}
