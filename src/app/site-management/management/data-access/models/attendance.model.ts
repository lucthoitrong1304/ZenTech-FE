import { ApiResponseDto, EmployeeProfileResponse } from '@/site-management/management/data-access/models/profile.model';

export interface CheckInRequest {
  faceDescriptor: number[];
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  faceImage?: string | null;
  requestedAction?: 'CHECK_IN' | 'CHECK_OUT';
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
  earlyArrival?: boolean;
  onTime?: boolean;
  late?: boolean;
  earlyCheckout?: boolean;
  inProgress?: boolean;
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
  faceImageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  locationValid?: boolean | null;
  distanceMeters?: number | null;
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
  totalEmployees?: number;
  totalShifts?: number;
  earlyArrival?: number;
  earlyCheckout?: number;
  workFromHome?: number;
  notStarted?: number;
  provisional?: number;
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
  days: PageResponse<AttendanceDayGroupResponse>;
}

export interface AttendanceDaySummaryResponse {
  totalEmployees: number; totalShifts: number; onTime: number; earlyArrival: number; late: number; earlyCheckout: number;
  leave: number; workFromHome: number; absent: number; missingCheckIn: number; missingCheckOut: number; notStarted: number;
  provisional: number; totalWorkingHours: number;
}

export interface AttendanceDayGroupResponse {
  workDate: string;
  summary: AttendanceDaySummaryResponse;
  records: AttendanceRecordResponse[];
}

export type AttendanceSummaryMetric = 'onTime' | 'earlyArrival' | 'late' | 'earlyCheckout' | 'leave' | 'workFromHome' | 'absent' | 'missingCheckIn' | 'missingCheckOut' | 'notStarted';
export interface AttendanceReportPreference { visibleMetrics: AttendanceSummaryMetric[]; updatedAt?: string | null; }

export type AttendanceReportApiResponse = ApiResponseDto<AttendanceReportResponse>;

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
