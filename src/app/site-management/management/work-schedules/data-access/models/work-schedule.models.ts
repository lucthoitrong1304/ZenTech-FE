export type ShiftType = 'NORMAL' | 'OFF' | 'DEFAULT';

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

export interface Shift {
  id: string;
  name: string;
  startTime: string | null;
  endTime: string | null;
  colorCode: string | null;
  isDefault: boolean;
  type: ShiftType;
}

export interface DailyShift {
  shiftId: string;
  shiftName: string;
  colorCode: string | null;
  workDate: string;
  startTime: string | null;
  endTime: string | null;
  shiftType: ShiftType;
}

export interface EmployeeWeeklySchedule {
  employeeId: string;
  employeeName: string;
  shifts: DailyShift[];
}

export interface WeeklyScheduleResponse {
  employees: PageResponseDto<EmployeeWeeklySchedule>;
}

export interface WorkSchedulePage {
  employees: EmployeeWeeklySchedule[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface WorkScheduleQuery {
  weekStartDate: string;
  weekEndDate: string;
  keyword: string;
  page: number;
  size: number;
}

export interface AssignShiftRequest {
  employeeId: string;
  shiftId: string;
  workDate: string;
  reason?: string;
}

export interface BulkShiftUpdateRequest {
  employeeIds: string[];
  selectAll: boolean;
  shiftId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface CopyWeekRequest {
  fromWeekStartDate: string;
  fromWeekEndDate: string;
  toWeekStartDate: string;
  toWeekEndDate: string;
  reason?: string;
}


export interface SelectedScheduleCell {
  employeeId: string;
  employeeName: string;
  workDate: string;
  shift: DailyShift | null;
}

export interface BulkAssignDraft {
  shiftId: string;
  startDate: string;
  endDate: string;
  selectAll: boolean;
}

export interface CopyWeekDraft {
  fromWeekStartDate: string;
  fromWeekEndDate: string;
  toWeekStartDate: string;
  toWeekEndDate: string;
}

export interface ShiftSettingsDraft {
  shifts: Shift[];
  newShift: CreateShiftRequest | null;
}

export interface CreateShiftRequest {
  name: string;
  startTime: string | null;
  endTime: string | null;
  colorCode: string;
  isDefault: boolean;
  type: ShiftType;
}

export type AttendanceLocationShapeType = 'CIRCLE' | 'POLYGON';

export interface AttendanceGeoPoint {
  lat: number;
  lng: number;
}

export interface AttendanceLocationPolicy {
  id: string | null;
  enabled: boolean;
  shapeType: AttendanceLocationShapeType;
  centerLatitude: number | null;
  centerLongitude: number | null;
  radiusMeters: number | null;
  polygonPoints: AttendanceGeoPoint[];
  updatedAt?: string | null;
  updatedBy?: string | null;
}
