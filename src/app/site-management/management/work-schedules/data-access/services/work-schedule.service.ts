import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import {
  ApiResponseDto,
  AttendanceLocationPolicy,
  AssignShiftRequest,
  BulkShiftUpdateRequest,
  CopyWeekRequest,
  CreateShiftRequest,
  Shift,
  WeeklyScheduleResponse,
  WorkSchedulePage,
  WorkScheduleQuery,
} from '../models/work-schedule.models';

@Injectable({
  providedIn: 'root',
})
export class WorkScheduleService {
  private readonly apiService = inject(ApiService);
  private readonly shiftsBaseUrl = `${environment.apiBaseUrl}/shifts`;
  private readonly locationPolicyUrl = `${environment.apiBaseUrl}/attendance/location-policy`;

  getShifts(): Observable<Shift[]> {
    return this.apiService
      .get<ApiResponseDto<Shift[]>>(this.shiftsBaseUrl)
      .pipe(map(response => unwrapApiResponse(response)));
  }

  createShift(payload: CreateShiftRequest): Observable<Shift> {
    return this.apiService
      .post<CreateShiftRequest, ApiResponseDto<Shift>>(this.shiftsBaseUrl, payload)
      .pipe(map(response => unwrapApiResponse(response)));
  }

  updateShifts(shifts: Shift[]): Observable<Shift[]> {
    return this.apiService
      .put<Shift[], ApiResponseDto<Shift[]>>(this.shiftsBaseUrl, shifts)
      .pipe(map(response => unwrapApiResponse(response)));
  }

  getLocationPolicy(): Observable<AttendanceLocationPolicy> {
    return this.apiService
      .get<ApiResponseDto<AttendanceLocationPolicy>>(this.locationPolicyUrl)
      .pipe(map(response => normalizeLocationPolicy(unwrapApiResponse(response))));
  }

  updateLocationPolicy(payload: AttendanceLocationPolicy): Observable<AttendanceLocationPolicy> {
    return this.apiService
      .put<AttendanceLocationPolicy, ApiResponseDto<AttendanceLocationPolicy>>(
        this.locationPolicyUrl,
        payload
      )
      .pipe(map(response => normalizeLocationPolicy(unwrapApiResponse(response))));
  }

  getWeeklySchedules(query: WorkScheduleQuery): Observable<WorkSchedulePage> {
    const params: Record<string, string | number> = {
      startDate: query.weekStartDate,
      endDate: query.weekEndDate,
      page: query.page,
      size: query.size,
    };
    const keyword = query.keyword.trim();

    if (keyword) {
      params['keyword'] = keyword;
    }

    return this.apiService
      .get<ApiResponseDto<WeeklyScheduleResponse>>(`${this.shiftsBaseUrl}/schedules`, {
        params,
      })
      .pipe(map(response => toWorkSchedulePage(unwrapApiResponse(response))));
  }

  assignShift(payload: AssignShiftRequest): Observable<void> {
    return this.apiService
      .post<AssignShiftRequest, ApiResponseDto<void>>(`${this.shiftsBaseUrl}/schedules`, payload)
      .pipe(map(response => unwrapApiResponse(response)));
  }

  bulkAssignShifts(payload: BulkShiftUpdateRequest): Observable<void> {
    return this.apiService
      .post<BulkShiftUpdateRequest, ApiResponseDto<void>>(
        `${this.shiftsBaseUrl}/schedules/bulk`,
        payload
      )
      .pipe(map(response => unwrapApiResponse(response)));
  }

  copyWeek(payload: CopyWeekRequest): Observable<void> {
    return this.apiService
      .post<CopyWeekRequest, ApiResponseDto<void>>(
        `${this.shiftsBaseUrl}/schedules/copy-week`,
        payload
      )
      .pipe(map(response => unwrapApiResponse(response)));
  }
}

function unwrapApiResponse<T>(response: ApiResponseDto<T>): T {
  if (!response.success) {
    throw new Error(response.message ?? 'Không thể xử lý yêu cầu.');
  }

  return response.data;
}

function toWorkSchedulePage(response: WeeklyScheduleResponse): WorkSchedulePage {
  const employeesPage = response.employees as any;
  return {
    employees: employeesPage.content,
    page: employeesPage.number ?? employeesPage.pageable?.pageNumber ?? employeesPage.page ?? 0,
    size: employeesPage.size ?? employeesPage.pageable?.pageSize ?? 10,
    totalElements: employeesPage.totalElements,
    totalPages: employeesPage.totalPages,
    last: employeesPage.last,
  };
}

function normalizeLocationPolicy(policy: AttendanceLocationPolicy): AttendanceLocationPolicy {
  return {
    id: policy.id ?? null,
    enabled: !!policy.enabled,
    shapeType: policy.shapeType ?? 'CIRCLE',
    centerLatitude: policy.centerLatitude ?? null,
    centerLongitude: policy.centerLongitude ?? null,
    radiusMeters: policy.radiusMeters ?? 100,
    polygonPoints: policy.polygonPoints ?? [],
    updatedAt: policy.updatedAt ?? null,
    updatedBy: policy.updatedBy ?? null,
  };
}
