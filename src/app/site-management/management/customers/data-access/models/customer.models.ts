export type CustomerActiveFilter = 'all' | 'active' | 'inactive';

export type CustomerSort = 'registeredAt,desc' | 'registeredAt,asc' | 'fullName,asc' | 'email,asc';

export type CustomerOrderSort =
  | 'createdAt,desc'
  | 'createdAt,asc'
  | 'finalPrice,desc'
  | 'finalPrice,asc';

export type CustomerOrderStatus = 'CREATED' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';

export type CustomerPaymentStatus = 'PENDING' | 'SUCCESS' | 'REFUNDED';

export type CustomerPaymentMethod = 'CASH' | 'VNPAY' | 'MOMO';

export interface CustomerSummary {
  customerId: string;
  fullName: string;
  email: string;
  active: boolean;
  registeredAt: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  imageUrl: string | null;
}

export interface CustomerAddress {
  addressId: string;
  phoneNumber: string | null;
  province: string | null;
  ward: string | null;
  street: string | null;
  isDefault: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CustomerDetail extends CustomerSummary {
  addressList: CustomerAddress[];
}

export interface CustomerOrderItem {
  orderItemId: string;
  productVariantId: string;
  productName: string;
  variantName: string | null;
  sku: string | null;
  productImage: string | null;
  quantity: number;
  unitPrice: number;
  priceAtPurchase: number;
  lineTotal: number;
}

export interface CustomerOrderHistory {
  orderId: string;
  createdAt: string | null;
  orderStatus: CustomerOrderStatus;
  paymentStatus: CustomerPaymentStatus;
  paymentMethod: CustomerPaymentMethod;
  finalPrice: number;
  shippingFee: number;
  discountAmount: number;
  items: CustomerOrderItem[];
}

export interface CustomerPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface CustomerListQuery {
  page: number;
  size: number;
  sort: CustomerSort;
  keyword: string;
  activeFilter: CustomerActiveFilter;
}

export interface CustomerOrderQuery {
  page: number;
  size: number;
  sort: CustomerOrderSort;
}
