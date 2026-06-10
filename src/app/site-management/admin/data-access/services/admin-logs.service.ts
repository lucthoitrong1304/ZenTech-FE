import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import { SystemLog } from '../models/admin.models';
import { HttpContext } from '@angular/common/http';
import { SKIP_AUTH_TOKEN, SKIP_CLIENT_LOG } from '../../../../core/tokens/api-context.token';

@Injectable({ providedIn: 'root' })
export class AdminLogsService {
  private readonly apiService = inject(ApiService);
  private readonly adminLogsUrl = `${environment.apiBaseUrl}/admin/logs`;
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
