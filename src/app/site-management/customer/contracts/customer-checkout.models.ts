export interface CustomerVoucherResponse {
  voucherId: string;
  couponId: string;
  couponCode: string;
  couponType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  discountValue: number;
  maxDiscount: number;
  minOrderAmount: number;
  startAt: string;
  endAt: string;
  status: 'AVAILABLE' | 'USED' | 'EXPIRED' | string;
  issuedAt: string;
  usedAt: string | null;
}
