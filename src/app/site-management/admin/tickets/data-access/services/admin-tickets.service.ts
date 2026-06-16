import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import { SupportTicket, TicketStatus, ApiResponse } from '../../../data-access/models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminTicketsService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/tickets`;

  /**
   * Lấy danh sách Ticket từ backend
   */
  getTickets(status?: TicketStatus): Observable<ApiResponse<SupportTicket[]>> {
    let url = this.baseUrl;
    if (status && status !== 'ALL' as any) {
      url += `?status=${status}`;
    }
    return this.apiService.get<ApiResponse<SupportTicket[]>>(url);
  }

  /**
   * Xem chi tiết ticket theo ID
   */
  getTicketById(id: string): Observable<ApiResponse<SupportTicket>> {
    return this.apiService.get<ApiResponse<SupportTicket>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Tạo mới Ticket (liên kết với Incident)
   */
  createTicket(payload: {
    title: string;
    description: string;
    priority: string;
    status: TicketStatus;
    assigneeId?: string;
    incidentId?: string;
  }): Observable<ApiResponse<SupportTicket>> {
    return this.apiService.post<typeof payload, ApiResponse<SupportTicket>>(this.baseUrl, payload);
  }

  /**
   * Gửi phản hồi thảo luận vào Ticket
   */
  sendReply(ticketId: string, content: string): Observable<ApiResponse<SupportTicket>> {
    return this.apiService.post<{ content: string }, ApiResponse<SupportTicket>>(
      `${this.baseUrl}/${ticketId}/messages`,
      { content }
    );
  }

  /**
   * Cập nhật trạng thái Ticket
   */
  updateTicketStatus(ticketId: string, status: TicketStatus): Observable<ApiResponse<SupportTicket>> {
    return this.apiService.patch<{ status: string }, ApiResponse<SupportTicket>>(
      `${this.baseUrl}/${ticketId}/status`,
      { status }
    );
  }
}
