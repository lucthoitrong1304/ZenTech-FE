export type { ApiResponseDto, PageResponseDto } from '@/core/api/api-response.models';

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
export type { CustomerVoucherResponse } from '@/site-management/customer/contracts/customer-checkout.models';

export interface CustomerAddressRequest {
  phoneNumber: string;
  province: string;
  ward: string;
  street: string;
  isDefault: boolean;
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

