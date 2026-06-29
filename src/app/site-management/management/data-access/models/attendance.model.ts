import { ApiResponseDto, EmployeeProfileResponse } from './profile.model';

export interface CheckInRequest {
  faceDescriptor: number[];
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
}

export type CheckInResponse = ApiResponseDto<EmployeeProfileResponse>;

export enum AttendanceStatus {
  EARLY = 'EARLY',
  ON_TIME = 'ON_TIME',
  LATE = 'LATE',
  MISSED = 'MISSED'
}

export interface AttendanceRecordResponse {
  id: string;
  employeeId: string;
  employeeName: string;
  workDate: string;
  shiftName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  workingHours: number;
  lateMinutes: number;
  earlyMinutes: number;
  status: string;
  detailTimes?: string[];
  isProvisional?: boolean;
  shiftBreakdowns?: AttendanceShiftBreakdownResponse[];
}

export interface AttendanceShiftBreakdownResponse {
  shiftId: string | null;
  employeeShiftId: string | null;
  shiftName: string;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  workingHours: number;
  lateMinutes: number;
  earlyMinutes: number;
  status: string;
  isProvisional: boolean;
  isLeave?: boolean;
  isWfh?: boolean;
  isAfk?: boolean;
  afkHours?: number;
  events: AttendanceEventTimelineResponse[];
}

export interface AttendanceEventTimelineResponse {
  type: string;
  timestamp: string;
  source: string | null;
}

export interface AttendanceStatisticsResponse {
  totalRecords: number;
  totalOnTime: number;
  totalLate: number;
  totalEarly: number;
  totalWorkingHours: number;
  totalMissingCheckIn: number;
  totalMissingCheckOut: number;
  totalAbsent: number;
  totalLeave: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface AttendanceReportResponse {
  statistics: AttendanceStatisticsResponse;
  records: PageResponse<AttendanceRecordResponse>;
}

export type AttendanceReportApiResponse = ApiResponseDto<AttendanceReportResponse>;
