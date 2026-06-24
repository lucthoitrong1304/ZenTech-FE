export interface ApiResponseDto<T> {
  success: boolean;
  data: T;
  message: string | null;
}

export interface PageResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface AccountProfile {
  customerId: string;
  fullName: string;
  email: string;
  imageUrl: string | null;
  registeredAt: string;
}

export interface UpdateMyProfileRequest {
  fullName: string;
  imageUrl?: string | null;
}

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

export interface CustomerAddressRequest {
  phoneNumber: string;
  province: string;
  ward: string;
  street: string;
  isDefault: boolean;
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

export interface CustomerOrderHistoryResponse {
  orderId: string;
  createdAt: string;
  orderStatus: string; // e.g. 'PROCESSING', 'DELIVERED', 'SHIPPED', 'CANCELLED'
  paymentStatus: string;
  paymentMethod: string;
  finalPrice: number;
  shippingFee: number;
  discountAmount: number;
  items: CustomerOrderItemResponse[];
}

export interface CustomerOrderCouponResponse {
  orderCouponId: string;
  couponCode: string;
  couponType: string;
  discountValue: number;
  maxDiscount: number;
  appliedAmount: number;
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

export interface CustomerVoucherResponse {
  voucherId: string;
  couponId: string;
  couponCode: string;
  couponType: string; // PERCENTAGE, FIXED_AMOUNT, FREE_SHIPPING
  discountValue: number;
  maxDiscount: number;
  minOrderAmount: number;
  startAt: string;
  endAt: string;
  status: string; // AVAILABLE, USED, EXPIRED
  issuedAt: string;
  usedAt: string | null;
}

export interface UploadPresignRequestDto {
  originalFilename: string;
  contentType: string;
  fileSize: number;
  purpose: 'CUSTOMER_AVATAR' | 'RETURN_EVIDENCE';
}

export interface UploadPresignResponseDto {
  presignedUrl: string;
  fileKey: string;
  method: 'PUT' | string;
  expiresInMinutes: number;
  requiredHeaders: Record<string, string>;
}

// UI State Filters & Statuses
export type VoucherStatus = 'active' | 'used' | 'expired';
export type OrderFilter = 'last30' | 'sixMonths' | 'year2026' | 'all';

