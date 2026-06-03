import { ApiResponseDto, EmployeeProfileResponse } from './profile.model';

export interface CheckInRequest {
  faceDescriptor: number[];
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
  checkInTime: string;
  status: AttendanceStatus;
}

export interface AttendanceStatisticsResponse {
  totalRecords: number;
  totalOnTime: number;
  totalLate: number;
  totalEarly: number;
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
