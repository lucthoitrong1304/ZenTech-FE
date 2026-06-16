import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import { SystemIncident, IncidentStatus, IncidentSeverity, ApiResponse, AiAnalysis } from '../../../data-access/models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminIncidentsService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/incidents`;

  /**
   * Lấy danh sách sự cố từ MySQL
   */
  getIncidents(status?: IncidentStatus): Observable<ApiResponse<SystemIncident[]>> {
    let url = this.baseUrl;
    if (status && status !== 'ALL' as any) {
      url += `?status=${status}`;
    }
    return this.apiService.get<ApiResponse<SystemIncident[]>>(url);
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
