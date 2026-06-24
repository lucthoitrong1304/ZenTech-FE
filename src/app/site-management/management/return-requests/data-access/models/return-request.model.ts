export interface ReturnRequest {
  id: string;
  orderId: string;
  customerName: string;
  reason: string;
  details: string | null;
  proofFileKeys: string | null;
  proofFileUrls: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  resellable: boolean;
  createdAt: string;
}
