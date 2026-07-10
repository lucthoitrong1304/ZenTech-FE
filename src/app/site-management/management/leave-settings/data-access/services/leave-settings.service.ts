import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import {
  LeaveQuota,
  LeaveSettingsEmployee,
  LeaveSettingsResponse,
  LeaveType,
  LeaveTypePayload,
} from '../models/leave-settings.models';

@Injectable({ providedIn: 'root' })
export class LeaveSettingsService {
  private readonly api = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/management`;
  getTypes(): Observable<LeaveSettingsResponse<LeaveType[]>> {
    return this.api.get(`${this.baseUrl}/leave-types`);
  }
  getEmployees(): Observable<LeaveSettingsResponse<{ content: LeaveSettingsEmployee[] }>> {
    return this.api.get(`${this.baseUrl}/employees`, { params: { size: 100, active: true } });
  }
  getQuotas(employeeId: string, year: number): Observable<LeaveSettingsResponse<LeaveQuota[]>> {
    return this.api.get(`${this.baseUrl}/employees/${employeeId}/leave-quotas`, {
      params: { year },
    });
  }
  saveType(
    payload: LeaveTypePayload,
    id: string | null,
  ): Observable<LeaveSettingsResponse<LeaveType>> {
    return id
      ? this.api.patch(`${this.baseUrl}/leave-types/${id}`, payload)
      : this.api.post(`${this.baseUrl}/leave-types`, payload);
  }
  saveQuotas(
    employeeId: string,
    year: number,
    quotas: { leaveTypeId: string; entitlement: number }[],
  ): Observable<LeaveSettingsResponse<LeaveQuota[]>> {
    return this.api.patch(
      `${this.baseUrl}/employees/${employeeId}/leave-quotas`,
      { quotas },
      { params: { year } },
    );
  }
}
