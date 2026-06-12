export enum ReportsTab {
  AIOps = 'AIOPS',
  Revenue = 'REVENUE',
  Products = 'PRODUCTS',
  Inventory = 'INVENTORY'
}

export enum ReportPeriod {
  Today = 'TODAY',
  Last7Days = 'LAST_7_DAYS',
  Last30Days = 'LAST_30_DAYS',
  Custom = 'CUSTOM'
}

export interface IReportsSummary {
  totalRevenue: number;
  forecastedRevenue: number;
  growthRate: number;
  totalOrders: number;
  averageOrderValue: number;
  aiOpsScore: number;
  autoFulfillmentRate: number;
}

export interface IPaymentMethodShare {
  method: string;
  percentage: number;
  revenue: number;
}

export interface ICategoryShare {
  categoryName: string;
  percentage: number;
  revenue: number;
}

export interface IRevenuePoint {
  label: string;
  currentValue: number;
  previousValue: number;
}

export interface IProductReport {
  productName: string;
  variantName: string;
  imageUrl?: string;
  categoryName?: string;
  price?: number;
  quantitySold: number;
  revenue: number;
  stockRemaining: number;
}

export interface ICouponReport {
  couponCode: string;
  usageCount: number;
  totalDiscountApplied: number;
}

export interface ICustomerSegment {
  customerName: string;
  email: string;
  imageUrl?: string;
  joinDate?: string;
  address?: string;
  totalSpent: number;
  orderCount: number;
}

export interface ICustomerRegistrationTrend {
  label: string;
  newRegistrationsCount: number;
}

export interface IAIOpsInsight {
  id: string;
  type: 'info' | 'warning' | 'success';
  category: 'revenue' | 'products' | 'customers' | 'inventory';
  title: string;
  description: string;
  createdAt: string;
}

export interface IInventoryStats {
  totalInventoryValue: number;
  totalItemsInStock: number;
  lowStockVariations: number;
  deadStockVariations: number;
  lowStockProducts?: IProductReport[];
}

export interface IAIAnalyzeResponse {
  content: string;
}
