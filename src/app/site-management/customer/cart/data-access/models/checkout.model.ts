export type CheckoutPaymentMethod = 'CASH' | 'VNPAY' | 'MOMO';

export interface CheckoutItemRequest {
  productVariantId: string;
  quantity: number;
}

export interface CheckoutRequest {
  addressId: string;
  paymentMethod: CheckoutPaymentMethod;
  items: CheckoutItemRequest[];
  customerVoucherId?: string;
}

export interface CheckoutResponse {
  orderId: string;
  paymentMethod: CheckoutPaymentMethod;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'REFUNDED';
  orderStatus: 'CREATED' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  amount: number;
  paymentUrl?: string | null;
}
