export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FREE_SHIPPING = 'FREE_SHIPPING',
}

export enum CustomerVoucherStatus {
  AVAILABLE = 'AVAILABLE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
}

export interface ManagementCoupon {
  id: string;
  code: string;
  type: CouponType;
  discountValue: number;
  maxDiscount: number;
  minOrderAmount: number;
  startAt: string | null;
  endAt: string | null;
  usageLimit: number;
  usedCount: number;
  active: boolean;
}

export interface CustomerVoucherDetail {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  couponId: string;
  couponCode: string;
  couponType: CouponType;
  discountValue: number;
  issuedAt: string;
  usedAt: string | null;
  status: CustomerVoucherStatus;
}

export interface MarketingStats {
  totalCoupons: number;
  activeCoupons: number;
  totalDiscountGiven: number;
  redemptionRate: number;
}

export interface CustomerSummary {
  customerId: string;
  fullName: string;
  email: string;
  imageUrl: string | null;
}

export interface CouponRequest {
  code: string;
  type: CouponType;
  discountValue: number;
  maxDiscount: number;
  minOrderAmount: number;
  startAt: string | null;
  endAt: string | null;
  usageLimit: number;
  active: boolean;
}

export interface IssueVoucherRequest {
  couponId: string;
  customerId: string | null;
}

export interface CouponFormValue {
  code: string;
  type: CouponType;
  discountValue: number;
  maxDiscount: number;
  minOrderAmount: number;
  startAt: string | null;
  endAt: string | null;
  usageLimit: number;
  active: boolean;
}

export interface ManagementCouponQuery {
  page: number;
  size: number;
  sort: string;
  keyword: string;
  type: CouponType | 'all';
  active: boolean | 'all';
}

export interface CustomerVoucherQuery {
  page: number;
  size: number;
  sort: string;
  keyword: string;
  couponCode: string;
  status: CustomerVoucherStatus | 'all';
}

export interface ManagementCouponPage {
  content: ManagementCoupon[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface CustomerVoucherPage {
  content: CustomerVoucherDetail[];
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

export interface PageResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
