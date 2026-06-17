import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import { SupportTicket, TicketStatus, TicketPriority, PaginatedResult, ApiResponse } from '../../../data-access/models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminTicketsService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/tickets`;

  /**
   * Lấy danh sách Ticket từ backend có phân trang và bộ lọc
   */
  getTickets(params: {
    page: number;
    size: number;
    status?: TicketStatus;
    priority?: TicketPriority;
    assigneeEmail?: string;
    startDate?: string | null;
    endDate?: string | null;
    search?: string;
  }): Observable<ApiResponse<PaginatedResult<SupportTicket>>> {
    let url = `${this.baseUrl}?page=${params.page}&size=${params.size}`;
    
    if (params.status && params.status !== 'ALL' as any) {
      url += `&status=${params.status}`;
    }
    if (params.priority && params.priority !== 'ALL' as any) {
      url += `&priority=${params.priority}`;
    }
    if (params.assigneeEmail && params.assigneeEmail !== 'ALL') {
      url += `&assigneeEmail=${params.assigneeEmail}`;
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
    
    return this.apiService.get<ApiResponse<PaginatedResult<SupportTicket>>>(url);
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

  /**
   * Cập nhật người phụ trách Ticket
   */
  updateTicketAssignee(ticketId: string, assigneeId: string | null): Observable<ApiResponse<SupportTicket>> {
    return this.apiService.patch<{ assigneeId: string | null }, ApiResponse<SupportTicket>>(
      `${this.baseUrl}/${ticketId}/assignee`,
      { assigneeId }
    );
  }
}
