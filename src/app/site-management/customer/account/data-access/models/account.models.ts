export type { ApiResponseDto, PageResponseDto } from '@/core/api/api-response.models';
import type { ApiResponseDto, PageResponseDto } from '@/core/api/api-response.models';

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

export type {
  CustomerAddressResponse,
  CustomerOrderCouponResponse,
  CustomerOrderDetailResponse,
  CustomerOrderHistoryResponse,
  CustomerOrderItemResponse,
} from '@/site-management/customer/contracts/customer-order.models';

import type {
  CustomerAddressResponse,
  CustomerOrderDetailResponse,
  CustomerOrderHistoryResponse,
} from '@/site-management/customer/contracts/customer-order.models';

export interface CustomerAddressRequest {
  phoneNumber: string;
  province: string;
  ward: string;
  street: string;
  isDefault: boolean;
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

