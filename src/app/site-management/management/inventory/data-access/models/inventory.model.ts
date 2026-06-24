export enum InventoryTransactionType {
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
}

export enum InventoryTransactionReason {
  NEW_STOCK = 'NEW_STOCK',
  ADJUSTMENT_ADD = 'ADJUSTMENT_ADD',
  CUSTOMER_ORDER = 'CUSTOMER_ORDER',
  DAMAGED = 'DAMAGED',
  ADJUSTMENT_SUB = 'ADJUSTMENT_SUB',
  RETURN = 'RETURN',
}

export enum StockStatusOption {
  ALL = 'all',
  OUT_OF_STOCK = 'out_of_stock',
  LOW_STOCK = 'low_stock',
  IN_STOCK = 'in_stock',
}

export enum TransactionTypeFilterOption {
  ALL = 'all',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
}

export interface InventorySummary {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  colorCode: string;
  originalPrice: number;
  salePrice: number | null;
  stockQuantity: number;
  faultyQuantity: number;
  representativeImageUrl: string | null;
}

export interface InventoryTransaction {
  id: string;
  productName: string;
  variantName: string;
  type: InventoryTransactionType;
  quantity: number;
  reason: InventoryTransactionReason;
  note: string | null;
  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
  createdByEmail: string | null;
  createdByAvatar: string | null;
  targetWarehouse?: string | null;
}

export interface InventoryAdjustmentRequest {
  productVariantId: string;
  type: InventoryTransactionType;
  quantity: number;
  reason: InventoryTransactionReason;
  note: string;
  targetWarehouse?: 'MAIN' | 'FAULTY';
}

export interface InventoryQuery {
  page: number;
  size: number;
  sort: string;
  keyword: string;
  stockStatus: StockStatusOption;
  type: TransactionTypeFilterOption;
  employeeId?: string;
  reason?: string;
  startDate?: string;
  endDate?: string;
}

export interface InventoryTransactionStats {
  totalImports: number;
  totalExports: number;
  totalCount: number;
}

export interface InventoryStats {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalFaultyVariants: number;
  totalFaultyQuantity: number;
  highFaultyAlertCount: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ApiResponseDto<T> {
  success: boolean;
  message: string | null;
  data: T;
}

export interface AiRecommendationResponse {
  content: string;
}
