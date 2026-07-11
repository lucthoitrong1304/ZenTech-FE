export type ApprovalDecision = 'APPROVED' | 'REJECTED';
export type ApprovalTab = 'leave' | 'swap' | 'adjust';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCEL_PENDING' | 'CANCELLED';

export interface ApprovalResponse<T> {
  success: boolean;
  data: T;
  message?: string | null;
}

export interface LeaveRequestApproval {
  id: string;
  employee: { fullName: string; email: string };
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  amount: number;
  overQuota: boolean;
  quotaRemainingBeforeRequest: number | null;
  quotaRemainingAfterRequest: number | null;
  leaveType: { id: string; name: string; unit: 'DAY' | 'HOUR' } | null;
  reason: string;
  status: ApprovalStatus;
  targetShifts?: { id: string; name: string }[] | null;
}

export interface ShiftSwapApproval {
  id: string;
  requester: { fullName: string; email: string };
  targetEmployee: { fullName: string; email: string };
  workDate: string;
  shift: { name: string } | null;
  targetWorkDate: string | null;
  targetShift: { name: string } | null;
  type: 'SWAP' | 'COVER';
  reason: string;
  status: ApprovalStatus;
  requestedAt: string;
}

export interface AttendanceAdjustmentApproval {
  id: string;
  employee: { fullName: string; email: string };
  workDate: string;
  type: string;
  proposedTime: string;
  reason: string;
  status: ApprovalStatus;
  requestedAt: string;
}
