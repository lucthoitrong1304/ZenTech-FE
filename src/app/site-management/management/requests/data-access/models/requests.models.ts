export type LeaveTypeUnit = 'DAY' | 'HOUR';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCEL_PENDING' | 'CANCELLED';
export type SwapRequestType = 'SWAP' | 'COVER';
export type AttendanceAdjustmentType =
  | 'FORGOT_CHECK_IN'
  | 'FORGOT_CHECK_OUT'
  | 'DEVICE_ERROR'
  | 'EDIT_TIME';
export type RequestsMutation =
  | 'leave'
  | 'swap'
  | 'adjustment'
  | 'cancel-leave'
  | 'cancel-swap'
  | 'cancel-adjustment';

export interface RequestsError {
  operation: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string | null;
}

export interface LeaveType {
  id: string;
  code: string; // Dùng để quy định mã được lưu xuống DB giải quyết case khi người dùng đổi name thì mã code vẫn sẽ quyết định logic nghiệp vụ ở dưới.
  name: string;
  description: string | null;
  unit: LeaveTypeUnit;
  active: boolean;
  systemDefault: boolean; // Dùng để xác định đây là của hệ thống tự khởi tạo
  sortOrder: number; // Dùng để hiển thị thứ tự display trong dropdown
}

export interface LeaveQuota {
  employeeId: string;
  leaveTypeId: string;
  leaveType: LeaveType;
  year: number;
  entitlement: number; // Tổng số quyền lợi
  approvedUsed: number; // Số phép đã dùng
  pendingUsed: number; // Số đơn đang chờ duyệt
  remaining: number; // Số phép còn lại có thể sử dụng
}

export interface ShiftDto {
  employeeShiftId: string;
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  colorCode: string;
  shiftType: string;
  workDate: string;
}

export interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  leaveType: LeaveType | null;
  amount: number; // Lượng phép sử dụng. Day: 1, 0.5 2. Hour: 2,5h
  overQuota: boolean; // Cờ check có vượt quá hạn mức được phép hay không?
  quotaRemainingBeforeRequest: number | null; // quota còn lại ngay trước khi tính đơn này.
  quotaRemainingAfterRequest: number | null; // quota dự kiến còn lại sau khi tính đơn này.
  reason: string;
  status: ApprovalStatus;
  requestedAt: string;
  targetShifts?: { id: string; name: string }[] | null; // Các ca cụ thể mà đơn áp dụng
}

// Dữ liệu cho dropdown (Đổi ca)
export interface EmployeeDirectoryEntry {
  employeeId: string;
  fullName: string;
  email: string;
}

export interface ShiftSwapRequest {
  id: string;
  requester: { fullName: string };
  targetEmployee: { fullName: string };
  workDate: string;
  shift: { name: string } | null;
  // Ngày và ca của đồng nghiệp để đổi. với type là cover là null
  targetWorkDate: string | null;
  targetShift: { name: string } | null;
  type: SwapRequestType;
  reason: string;
  status: ApprovalStatus;
  requestedAt: string;
}

// Điều chỉnh chấm công
export interface AttendanceAdjustment {
  id: string;
  workDate: string;
  type: string;
  proposedTime: string;
  reason: string;
  status: ApprovalStatus;
  requestedAt: string;
}

export interface CreateLeaveRequest {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  shiftIds: string[];
  reason: string;
}

export interface CreateSwapRequest {
  targetEmployee: { id: string };
  workDate: string;
  shift: { id: string } | null;
  targetWorkDate: string | null;
  targetShift: { id: string } | null;
  type: SwapRequestType;
  reason: string;
  status: 'PENDING';
}

export interface CreateAttendanceAdjustment {
  workDate: string;
  type: AttendanceAdjustmentType;
  proposedTime: string;
  reason: string;
  status: 'PENDING';
}

interface ScheduledEmployee {
  employeeId: string;
  shifts?: ShiftDto[];
}

export interface ColleagueScheduleResponse {
  employees?: { content?: ScheduledEmployee[] };
}
