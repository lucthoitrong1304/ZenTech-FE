import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import {
  ApiResponse,
  AttendanceAdjustment,
  ColleagueScheduleResponse,
  CreateAttendanceAdjustment,
  CreateLeaveRequest,
  CreateSwapRequest,
  EmployeeDirectoryEntry,
  LeaveQuota,
  LeaveRequest,
  LeaveType,
  ShiftDto,
  ShiftSwapRequest,
} from '../models/requests.models';

@Injectable()
export class RequestsService {
  private readonly api = inject(ApiService);
  private readonly baseUrl = environment.apiBaseUrl;

  // Lấy Lấy danh sách loại phép
  getLeaveTypes(): Observable<ApiResponse<LeaveType[]>> {
    return this.api.get(`${this.baseUrl}/leave-types`);
  }

  // Lấy hạn mức phép của nhân viên
  getMyQuotas(): Observable<ApiResponse<LeaveQuota[]>> {
    return this.api.get(`${this.baseUrl}/leaves/my/quotas`);
  }

  // Lấy lịch sử submit
  getMyLeaves(): Observable<ApiResponse<LeaveRequest[]>> {
    return this.api.get(`${this.baseUrl}/leaves/my`);
  }

  // Lấy ca nhân viên hiện tại theo ngày
  getMyShifts(date: string): Observable<ApiResponse<ShiftDto[]>> {
    return this.api.get(`${this.baseUrl}/shifts/my-schedules`, {
      params: { startDate: date, endDate: date },
    });
  }

  // Lấy danh sách nhân viên
  getColleagues(): Observable<ApiResponse<{ content: EmployeeDirectoryEntry[] }>> {
    return this.api.get(`${this.baseUrl}/management/employees`, { params: { size: 100 } });
  }

  // Lấy lịch làm việc của nhân viên được chọn
  getColleagueShifts(
    employeeId: string,
    date: string,
  ): Observable<ApiResponse<ColleagueScheduleResponse>> {
    return this.api.get(`${this.baseUrl}/shifts/schedules`, {
      params: { startDate: date, endDate: date, employeeId },
    });
  }

  // Lấy lịch sử yêu cầu đổi ca/trực thay của nhân viên hiện tại
  getMySwaps(): Observable<ApiResponse<ShiftSwapRequest[]>> {
    return this.api.get(`${this.baseUrl}/schedules/swaps/my`);
  }

  // Lấy lịch sử yêu cầu điều chỉnh chấm công của nhân viên hiện tại
  getMyAdjustments(): Observable<ApiResponse<AttendanceAdjustment[]>> {
    return this.api.get(`${this.baseUrl}/attendance/adjustments/my`);
  }

  // Submit một yêu cầu
  createLeave(payload: CreateLeaveRequest): Observable<ApiResponse<LeaveRequest>> {
    return this.api.post(`${this.baseUrl}/leaves`, payload);
  }

  // Submit swap
  createSwap(payload: CreateSwapRequest): Observable<ApiResponse<ShiftSwapRequest>> {
    return this.api.post(`${this.baseUrl}/schedules/swaps`, payload);
  }

  // Tạo điều chỉnh chấm công
  createAdjustment(
    payload: CreateAttendanceAdjustment,
  ): Observable<ApiResponse<AttendanceAdjustment>> {
    return this.api.post(`${this.baseUrl}/attendance/adjustments`, payload);
  }

  // Huỷ 1 yêu cầu
  cancelLeave(id: string): Observable<ApiResponse<LeaveRequest>> {
    return this.api.post(`${this.baseUrl}/leaves/${id}/cancel`, null);
  }

  // Huỷ swap
  cancelSwap(id: string): Observable<ApiResponse<ShiftSwapRequest>> {
    return this.api.post(`${this.baseUrl}/schedules/swaps/${id}/cancel`, null);
  }

  // Huỷ điều chỉnh
  cancelAdjustment(id: string): Observable<ApiResponse<AttendanceAdjustment>> {
    return this.api.post(`${this.baseUrl}/attendance/adjustments/${id}/cancel`, null);
  }
}
