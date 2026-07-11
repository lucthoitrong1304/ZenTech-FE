export interface CustomerAddressResponse {
  addressId: string;
  phoneNumber: string;
  province: string;
  ward: string;
  street: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOrderItemResponse {
  orderItemId: string;
  productVariantId: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  priceAtPurchase: number;
  lineTotal: number;
  subtotal: number;
  productImage: string | null;
}

export interface CustomerOrderCouponResponse {
  orderCouponId: string;
  couponCode: string;
  couponType: string;
  discountValue: number;
  maxDiscount: number;
  appliedAmount: number;
}

export interface CustomerOrderHistoryResponse {
  orderId: string;
  createdAt: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  finalPrice: number;
  shippingFee: number;
  discountAmount: number;
  items: CustomerOrderItemResponse[];
}

export interface CustomerOrderDetailResponse {
  orderId: string;
  createdAt: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  originalTotalPrice: number;
  discountAmount: number;
  shippingFee: number;
  finalPrice: number;
  shippingAddress: CustomerAddressResponse | null;
  items: CustomerOrderItemResponse[];
  coupons: CustomerOrderCouponResponse[];
}
