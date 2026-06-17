import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import { SystemIncident, IncidentStatus, IncidentSeverity, PaginatedResult, ApiResponse, AiAnalysis } from '../../../data-access/models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminIncidentsService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/incidents`;

  /**
   * Lấy danh sách sự cố từ MySQL có phân trang và bộ lọc
   */
  getIncidents(params: {
    page: number;
    size: number;
    status?: IncidentStatus;
    severity?: IncidentSeverity;
    assignee?: string;
    startDate?: string | null;
    endDate?: string | null;
    search?: string;
  }): Observable<ApiResponse<PaginatedResult<SystemIncident>>> {
    let url = `${this.baseUrl}?page=${params.page}&size=${params.size}`;
    
    if (params.status && params.status !== 'ALL' as any) {
      url += `&status=${params.status}`;
    }
    if (params.severity && params.severity !== 'ALL' as any) {
      url += `&severity=${params.severity}`;
    }
    if (params.assignee && params.assignee !== 'ALL') {
      url += `&assignee=${params.assignee}`;
    }
    if (params.startDate) {
      const d = new Date(params.startDate);
      d.setHours(0, 0, 0, 0);
      url += `&startDate=${d.toISOString()}`;
    }
    if (params.endDate) {
      const d = new Date(params.endDate);
      d.setHours(23, 59, 59, 999);
      url += `&endDate=${d.toISOString()}`;
    }
    if (params.search && params.search.trim()) {
      url += `&search=${encodeURIComponent(params.search.trim())}`;
    }
    
    return this.apiService.get<ApiResponse<PaginatedResult<SystemIncident>>>(url);
  }

  /**
   * Xem chi tiết sự cố theo ID
   */
  getIncidentById(id: string): Observable<ApiResponse<SystemIncident>> {
    return this.apiService.get<ApiResponse<SystemIncident>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Tạo thủ công sự cố
   */
  createIncident(payload: Partial<SystemIncident>): Observable<ApiResponse<SystemIncident>> {
    return this.apiService.post<Partial<SystemIncident>, ApiResponse<SystemIncident>>(this.baseUrl, payload);
  }

  /**
   * Cập nhật trạng thái/mức độ/người phụ trách sự cố
   */
  updateIncidentStatus(
    id: string,
    payload: { status?: IncidentStatus; severity?: IncidentSeverity; assignee?: string }
  ): Observable<ApiResponse<SystemIncident>> {
    return this.apiService.patch<typeof payload, ApiResponse<SystemIncident>>(
      `${this.baseUrl}/${id}/status`,
      payload
    );
  }

  /**
   * Gọi AI phân tích sự cố
   */
  analyzeIncident(id: string): Observable<ApiResponse<AiAnalysis>> {
    return this.apiService.post<any, ApiResponse<AiAnalysis>>(`${this.baseUrl}/${id}/analyze`, {});
  }
}
