export type ManagementOrderStatus = 'CREATED' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';

export type ManagementPaymentStatus = 'PENDING' | 'SUCCESS' | 'REFUNDED';

export type ManagementPaymentMethod = 'CASH' | 'VNPAY' | 'MOMO';

export type ManagementOrderStatusFilter = 'all' | ManagementOrderStatus;

export type ManagementOrderDateFilter = 'all' | 'today' | 'last7days' | 'last30days';

export type ManagementOrderSort = 'createdAt,desc' | 'createdAt,asc' | 'finalPrice,desc' | 'finalPrice,asc';

export interface ManagementOrderCustomer {
  fullName: string;
  email: string;
  shippingAddress: string;
  imageUrl?: string | null;
}

export interface ManagementOrderItem {
  orderItemId: string;
  productName: string;
  variantName: string | null;
  productImage: string | null;
  quantity: number;
  unitPrice: number;
}

export interface ManagementOrder {
  orderId: string;
  orderCode: string;
  createdAt: string;
  customer: ManagementOrderCustomer;
  paymentMethod: ManagementPaymentMethod;
  paymentStatus: ManagementPaymentStatus;
  orderStatus: ManagementOrderStatus;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  finalPrice: number;
  items: ManagementOrderItem[];
}

export interface ManagementOrderQuery {
  page: number;
  size: number;
  sort: ManagementOrderSort;
  keyword: string;
  status: ManagementOrderStatusFilter;
  dateFilter: ManagementOrderDateFilter;
  startDate?: string;
  endDate?: string;
}

export interface ManagementOrderPage {
  orders: ManagementOrder[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ManagementOrderEditDraft {
  orderId: string;
  customerName: string;
  shippingAddress: string;
  orderStatus: ManagementOrderStatus;
  items: ManagementOrderEditItemDraft[];
}

export interface ManagementOrderEditItemDraft {
  orderItemId: string;
  quantity: number;
}

export interface ManagementOrderFormErrors {
  customerName?: string;
  shippingAddress?: string;
  items?: string;
  submit?: string;
}
