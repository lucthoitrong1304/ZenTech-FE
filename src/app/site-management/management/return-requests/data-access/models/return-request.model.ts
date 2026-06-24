export enum ReturnRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface ReturnRequestOrderItem {
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

export interface ReturnRequest {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerAvatarUrl: string | null;
  reason: string;
  details: string | null;
  proofFileKeys: string | null;
  proofFileUrls: string[];
  status: ReturnRequestStatus;
  resellable: boolean;
  createdAt: string;

  // Chi tiết tài chính & vật phẩm của đơn hàng
  originalTotalPrice: number;
  discountAmount: number;
  shippingFee: number;
  finalPrice: number;
  orderItems: ReturnRequestOrderItem[];
}

