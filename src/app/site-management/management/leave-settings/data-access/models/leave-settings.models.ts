export type LeaveTypeUnit = 'DAY' | 'HOUR';
export interface LeaveSettingsResponse<T> {
  success: boolean;
  data: T;
  message?: string | null;
}
export interface LeaveType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: LeaveTypeUnit;
  active: boolean;
  systemDefault: boolean;
  sortOrder: number;
}
export interface LeaveSettingsEmployee {
  employeeId: string;
  fullName: string;
  email: string;
}
export interface LeaveQuota {
  leaveTypeId: string;
  leaveType: LeaveType;
  year: number;
  entitlement: number;
  approvedUsed: number;
  pendingUsed: number;
  remaining: number;
}
export interface LeaveTypePayload {
  name: string;
  code: string;
  description: string;
  unit: LeaveTypeUnit;
  active: boolean;
  sortOrder: number;
}
