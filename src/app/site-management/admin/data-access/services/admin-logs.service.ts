import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import {
  SystemLog,
  ActivityLog,
  ActivityLogRecordPayload,
  ActivityTimelineSummaryRequest,
  ActivityTimelineSummaryResponse,
  PaginatedResult,
  ApiResponse
} from '../models/admin.models';
import { HttpContext } from '@angular/common/http';
import { SKIP_AUTH_TOKEN, SKIP_CLIENT_LOG } from '../../../../core/tokens/api-context.token';

@Injectable({ providedIn: 'root' })
export class AdminLogsService {
  private readonly apiService = inject(ApiService);
  private readonly adminLogsUrl = `${environment.apiBaseUrl}/admin/logs`;
  private readonly activityLogsUrl = `${environment.apiBaseUrl}/admin/activity-logs`;
  private readonly explainLogUrl = `${environment.apiBaseUrl}/admin/logs/explain`;
  private readonly clientLogUrl = `${environment.apiBaseUrl}/logs/client`;

  /**
   * Lấy danh sách logs từ Loki thông qua Backend
   */
  getLogs(
    level: string = 'ALL',
    search: string = '',
    traceId: string = '',
    limit: number = 500
  ): Observable<SystemLog[]> {
    const url = `${this.adminLogsUrl}?level=${level}&search=${encodeURIComponent(search)}&traceId=${traceId}&limit=${limit}`;
    return this.apiService.get<SystemLog[]>(url);
  }

  /**
   * Lấy danh sách activity logs từ MySQL thông qua Backend (Phân trang và lọc)
   */
  getActivityLogs(
    page: number = 0,
    size: number = 10,
    search: string = '',
    area?: string,
    severity?: string,
    module?: string,
    action?: string,
    from?: string,
    to?: string
  ): Observable<ApiResponse<PaginatedResult<ActivityLog>>> {
    let url = `${this.activityLogsUrl}?page=${page}&size=${size}&search=${encodeURIComponent(search)}`;
    if (area && area !== 'ALL') url += `&area=${area}`;
    if (severity && severity !== 'ALL') url += `&severity=${severity}`;
    if (module && module !== 'ALL') url += `&module=${encodeURIComponent(module)}`;
    if (action && action !== 'ALL') url += `&action=${action}`;
    if (from) url += `&from=${encodeURIComponent(from)}`;
    if (to) url += `&to=${encodeURIComponent(to)}`;
    return this.apiService.get<ApiResponse<PaginatedResult<ActivityLog>>>(url);
  }

  getActivityTimeline(params: {
    userId?: string;
    email?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
    severity?: string;
    module?: string;
    action?: string;
  }): Observable<ApiResponse<PaginatedResult<ActivityLog>>> {
    let url = `${this.activityLogsUrl}/timeline?page=${params.page ?? 0}&size=${params.size ?? 50}`;
    if (params.userId) url += `&userId=${encodeURIComponent(params.userId)}`;
    if (params.email) url += `&email=${encodeURIComponent(params.email)}`;
    if (params.from) url += `&from=${encodeURIComponent(params.from)}`;
    if (params.to) url += `&to=${encodeURIComponent(params.to)}`;
    if (params.severity && params.severity !== 'ALL') url += `&severity=${params.severity}`;
    if (params.module && params.module !== 'ALL') url += `&module=${encodeURIComponent(params.module)}`;
    if (params.action && params.action !== 'ALL') url += `&action=${params.action}`;
    return this.apiService.get<ApiResponse<PaginatedResult<ActivityLog>>>(url);
  }

  getActivityLogModules(): Observable<ApiResponse<string[]>> {
    return this.apiService.get<ApiResponse<string[]>>(`${this.activityLogsUrl}/modules`);
  }

  getActivityLogActions(): Observable<ApiResponse<string[]>> {
    return this.apiService.get<ApiResponse<string[]>>(`${this.activityLogsUrl}/actions`);
  }

  summarizeActivityTimeline(
    payload: ActivityTimelineSummaryRequest
  ): Observable<ApiResponse<ActivityTimelineSummaryResponse>> {
    return this.apiService.post<ActivityTimelineSummaryRequest, ApiResponse<ActivityTimelineSummaryResponse>>(
      `${this.activityLogsUrl}/timeline/summary`,
      payload
    );
  }

  recordActivityLog(payload: ActivityLogRecordPayload): Observable<ApiResponse<void>> {
    return this.apiService.post<ActivityLogRecordPayload, ApiResponse<void>>(
      `${this.activityLogsUrl}/record`,
      payload
    );
  }

  /**
   * Gọi AI phân tích và giải thích log lỗi nhanh
   */
  explainLog(
    logMessage: string,
    logDetails: string,
    service: string
  ): Observable<{ explanation: string }> {
    const payload = { logMessage, logDetails, service };
    return this.apiService.post<typeof payload, { explanation: string }>(
      this.explainLogUrl,
      payload
    );
  }

  /**
   * Gửi log lỗi client-side về cho Backend ghi nhận vào file frontend.log
   */
  writeClientLog(payload: {
    traceId: string;
    level: string;
    message: string;
    url: string;
    stackTrace: string;
  }): Observable<{ success: boolean; message: string }> {
    return this.apiService.post<typeof payload, { success: boolean; message: string }>(
      this.clientLogUrl,
      payload,
      {
        context: new HttpContext()
          .set(SKIP_AUTH_TOKEN, true)
          .set(SKIP_CLIENT_LOG, true), // Log client có thể gửi lên ngay cả khi chưa login và không tự log request này
      }
    );
  }
}
