import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import { ApiResponse, PaginatedResult } from '../../../../admin/data-access/models/admin.models';
import { ManagementImpactDashboardDto, ManagementIncidentImpactDto, AffectedUserDetail } from '../models/management-business-impact.model';

@Injectable({
  providedIn: 'root',
})
export class ManagementBusinessImpactService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/management/impact-analysis`;

  getDashboardStats(startDate?: string | null, endDate?: string | null): Observable<ApiResponse<ManagementImpactDashboardDto>> {
    const params: Record<string, string> = {};
    if (startDate) params['startDate'] = startDate;
    if (endDate) params['endDate'] = endDate;
    return this.apiService.get<ApiResponse<ManagementImpactDashboardDto>>(`${this.baseUrl}/dashboard`, { params });
  }

  getIncidents(
    page: number,
    size: number,
    search?: string | null,
    startDate?: string | null,
    endDate?: string | null
  ): Observable<ApiResponse<PaginatedResult<ManagementIncidentImpactDto>>> {
    const params: Record<string, string> = {
      page: page.toString(),
      size: size.toString(),
    };
    if (search) params['search'] = search;
    if (startDate) params['startDate'] = startDate;
    if (endDate) params['endDate'] = endDate;

    return this.apiService.get<ApiResponse<PaginatedResult<ManagementIncidentImpactDto>>>(
      `${this.baseUrl}/incidents`,
      { params }
    );
  }

  getIncidentDetail(incidentId: string): Observable<ApiResponse<ManagementIncidentImpactDto>> {
    return this.apiService.get<ApiResponse<ManagementIncidentImpactDto>>(`${this.baseUrl}/incidents/${incidentId}`);
  }

  analyzeAi(incidentId: string): Observable<ApiResponse<ManagementIncidentImpactDto>> {
    return this.apiService.post<any, ApiResponse<ManagementIncidentImpactDto>>(
      `${this.baseUrl}/incidents/${incidentId}/analyze-ai`,
      {}
    );
  }

  getAffectedUsers(incidentId: string): Observable<ApiResponse<AffectedUserDetail[]>> {
    return this.apiService.get<ApiResponse<AffectedUserDetail[]>>(`${this.baseUrl}/incidents/${incidentId}/affected-users`);
  }
}
