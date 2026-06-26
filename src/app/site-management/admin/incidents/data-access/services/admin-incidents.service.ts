import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { SKIP_CLIENT_LOG, SKIP_GLOBAL_ERROR } from '../../../../../core/tokens/api-context.token';
import { environment } from '../../../../../../environments/environment';
import {
  SystemIncident,
  IncidentStatus,
  IncidentSeverity,
  PaginatedResult,
  ApiResponse,
  AiAnalysis,
  IssueIncidentLink
} from '../../../data-access/models/admin.models';

export interface IncidentFromIssuePayload {
  issueSignature: string;
  title: string;
  serviceName?: string;
  apiPath?: string;
  httpMethod?: string;
  statusCode?: number;
  errorMessage?: string;
  traceId?: string;
  stackTrace?: string;
  occurredAt?: string;
  severity: IncidentSeverity;
}

@Injectable({ providedIn: 'root' })
export class AdminIncidentsService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/incidents`;

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

  getIncidentById(id: string): Observable<ApiResponse<SystemIncident>> {
    return this.apiService.get<ApiResponse<SystemIncident>>(`${this.baseUrl}/${id}`);
  }

  createIncident(payload: Partial<SystemIncident>): Observable<ApiResponse<SystemIncident>> {
    return this.apiService.post<Partial<SystemIncident>, ApiResponse<SystemIncident>>(this.baseUrl, payload);
  }

  createIncidentFromIssue(payload: IncidentFromIssuePayload): Observable<ApiResponse<SystemIncident>> {
    return this.apiService.post<IncidentFromIssuePayload, ApiResponse<SystemIncident>>(`${this.baseUrl}/from-issue`, payload);
  }

  getIssueLinks(signatures: string[]): Observable<ApiResponse<Record<string, IssueIncidentLink>>> {
    return this.apiService.post<{ signatures: string[] }, ApiResponse<Record<string, IssueIncidentLink>>>(
      `${this.baseUrl}/issue-links`,
      { signatures },
      { context: new HttpContext().set(SKIP_GLOBAL_ERROR, true).set(SKIP_CLIENT_LOG, true) }
    );
  }

  updateIncidentStatus(
    id: string,
    payload: { status?: IncidentStatus; severity?: IncidentSeverity; assignee?: string }
  ): Observable<ApiResponse<SystemIncident>> {
    return this.apiService.patch<typeof payload, ApiResponse<SystemIncident>>(
      `${this.baseUrl}/${id}/status`,
      payload
    );
  }

  analyzeIncident(id: string): Observable<ApiResponse<AiAnalysis>> {
    return this.apiService.post<any, ApiResponse<AiAnalysis>>(`${this.baseUrl}/${id}/analyze`, {});
  }
}
