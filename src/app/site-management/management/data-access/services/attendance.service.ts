import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@/core/api/api.service';
import { environment } from '@env/environment';
import { 
  CheckInRequest, 
  CheckInResponse,
  AttendanceLocationPolicy,
  AttendanceReportApiResponse,
  AttendanceReportPreference,
} from '@/site-management/management/data-access/models/attendance.model';
import { ApiResponseDto } from '@/site-management/management/data-access/models/profile.model';

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/attendance`;
  private readonly locationPolicyUrl = `${environment.apiBaseUrl}/attendance/location-policy`;

  checkIn(payload: CheckInRequest): Observable<CheckInResponse> {
    return this.apiService.post<CheckInRequest, CheckInResponse>(
      `${this.baseUrl}/check-in`,
      payload
    );
  }

  getReport(startDate: string, endDate: string, page: number = 0, size: number = 10): Observable<AttendanceReportApiResponse> {
    return this.apiService.get<AttendanceReportApiResponse>(
      `${this.baseUrl}/report`,
      {
        params: {
          startDate,
          endDate,
          page: page.toString(),
          size: size.toString()
        }
      }
    );
  }

  getLocationPolicy(): Observable<ApiResponseDto<AttendanceLocationPolicy>> {
    return this.apiService.get<ApiResponseDto<AttendanceLocationPolicy>>(this.locationPolicyUrl);
  }

  getReportPreference(): Observable<ApiResponseDto<AttendanceReportPreference>> {
    return this.apiService.get<ApiResponseDto<AttendanceReportPreference>>(`${this.baseUrl}/report/preferences`);
  }

  saveReportPreference(visibleMetrics: string[]): Observable<ApiResponseDto<AttendanceReportPreference>> {
    return this.apiService.put<{ visibleMetrics: string[] }, ApiResponseDto<AttendanceReportPreference>>(
      `${this.baseUrl}/report/preferences`, { visibleMetrics }
    );
  }
}
