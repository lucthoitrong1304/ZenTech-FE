export type ManagementOrderStatus = 'PROCESSING' | 'DELIVERED' | 'CANCELLED' | 'PAYMENT_PENDING';

export type ManagementPaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED';

export type ManagementPaymentMethod = 'COD' | 'MOMO' | 'VNPAY';

export type ManagementOrderStatusFilter = 'all' | ManagementOrderStatus;

export type ManagementOrderDateFilter = 'all' | 'today' | 'last7days' | 'last30days';

export type ManagementOrderSort = 'createdAt,desc' | 'createdAt,asc' | 'finalPrice,desc' | 'finalPrice,asc';

export interface ManagementOrderCustomer {
  fullName: string;
  email: string;
  shippingAddress: string;
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
