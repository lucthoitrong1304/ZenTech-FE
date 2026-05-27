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

export interface ApiResponseDto<T> {
  success: boolean;
  message: string | null;
  data: T;
}

export interface PageResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ProductCategorySummaryResponseDto {
  id: string;
  categoryName: string;
  shortName: string;
  hasChildren: boolean;
  children: ProductCategorySummaryResponseDto[];
}

export interface ProductManagementSummaryResponseDto {
  id: string;
  productName: string;
  representativeImageUrl: string | null;
  productGroupId: string | null;
  productGroupName: string | null;
  categories: ProductCategorySummaryResponseDto[];
  variantCount: number;
  price: number;
  stock: number;
  status: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProductGroupResponseDto {
  id: string;
  groupName: string;
  description: string | null;
  deleted: boolean;
  deletedAt: string | null;
  updatedAt: string;
  productIds: string[];
  productCount: number;
}

export interface MarkdownBulletRequest {
  label: string | null;
  value: string;
}

export interface MarkdownSectionRequest {
  heading: string | null;
  paragraphs: string[] | null;
  bullets: MarkdownBulletRequest[] | null;
}

export interface MarkdownContentRequest {
  sections: MarkdownSectionRequest[];
}

export interface ProductVariantUpsertRequest {
  id?: string;
  originalPrice: number;
  salePrice?: number | null;
  name?: string;
  nameColor?: string;
  colorCode?: string;
  saleStartAt?: string | null;
  saleEndAt?: string | null;
  stockQuantity: number;
}

export interface ProductCreateRequest {
  productName: string;
  productGroupId?: string | null;
  categoryIds: string[];
  representativeImageKey?: string | null;
  imageKeys: string[];
  description?: MarkdownContentRequest | null;
  specifications?: MarkdownContentRequest | null;
  compatibility?: MarkdownContentRequest | null;
  boxContents?: MarkdownContentRequest | null;
  supportInfo?: MarkdownContentRequest | null;
  variants: ProductVariantUpsertRequest[];
}

export interface ProductUpdateRequest {
  productName?: string;
  productGroupId?: string | null;
  clearProductGroup?: boolean;
  categoryIds?: string[];
  representativeImageKey?: string | null;
  clearRepresentativeImage?: boolean;
  imageKeys?: string[];
  description?: MarkdownContentRequest | null;
  specifications?: MarkdownContentRequest | null;
  compatibility?: MarkdownContentRequest | null;
  boxContents?: MarkdownContentRequest | null;
  supportInfo?: MarkdownContentRequest | null;
  variants?: ProductVariantUpsertRequest[];
}

export interface ProductVariantManagementResponse {
  id: string;
  originalPrice: number;
  salePrice: number | null;
  name: string | null;
  nameColor: string | null;
  colorCode: string | null;
  saleStartAt: string | null;
  saleEndAt: string | null;
  stockQuantity: number;
  deleted: boolean;
  deletedAt: string | null;
}

export interface ProductManagementDetailResponse {
  id: string;
  productName: string;
  description: string | null;
  specifications: string | null;
  compatibility: string | null;
  boxContents: string | null;
  supportInfo: string | null;
  representativeImageKey: string | null;
  representativeImageUrl: string | null;
  imageKeys: string[];
  productImageUrls: string[];
  productGroup: ProductGroupResponseDto | null;
  categories: ProductCategorySummaryResponseDto[];
  variants: ProductVariantManagementResponse[];
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ManagementProductFormErrors {
  productName?: string;
  categoryIds?: string;
  variants?: string;
  submit?: string;
}

export interface ProductFormValue {
  productName: string;
  productGroupId: string | null;
  categoryIds: string[];
  representativeImageKey: string | null;
  imageKeys: string[];
  descriptionRaw: string;
  specificationsRaw: string;
  compatibilityRaw: string;
  boxContentsRaw: string;
  supportInfoRaw: string;
  variants: ProductVariantUpsertRequest[];
}

