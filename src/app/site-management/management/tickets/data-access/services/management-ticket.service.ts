import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import { ApiResponse, CustomerTicketStatus, ManagementTicket, ManagementTicketPage, ManagementTicketQuery } from '../models/management-ticket.models';

@Injectable({ providedIn: 'root' })
export class ManagementTicketService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/management/tickets`;
  private readonly customerStatusUrl = `${environment.apiBaseUrl}/chat/tickets/status`;

  getTickets(query: ManagementTicketQuery): Observable<ManagementTicketPage> {
    const params: Record<string, string> = {
      page: query.page.toString(),
      size: query.size.toString(),
    };
    if (query.status !== 'ALL') params['status'] = query.status;
    if (query.priority !== 'ALL') params['priority'] = query.priority;
    if (query.assigneeEmail && query.assigneeEmail !== 'ALL') params['assigneeEmail'] = query.assigneeEmail;
    if (query.customerEmail.trim()) params['customerEmail'] = query.customerEmail.trim();
    if (query.search.trim()) params['search'] = query.search.trim();
    if (query.startDate) {
      const start = new Date(query.startDate);
      start.setHours(0, 0, 0, 0);
      params['startDate'] = start.toISOString();
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      params['endDate'] = end.toISOString();
    }

    return this.apiService
      .get<ApiResponse<ManagementTicketPage>>(this.baseUrl, { params })
      .pipe(map(res => res.data));
  }

  getTicketById(id: string): Observable<ManagementTicket> {
    return this.apiService
      .get<ApiResponse<ManagementTicket>>(`${this.baseUrl}/${id}`)
      .pipe(map(res => res.data));
  }

  getTicketsForCustomer(customerEmail: string, size = 5): Observable<ManagementTicketPage> {
    return this.getTickets({
      page: 0,
      size,
      status: 'ALL',
      priority: 'ALL',
      assigneeEmail: 'ALL',
      customerEmail,
      search: '',
    });
  }

  getCustomerTicketStatus(): Observable<CustomerTicketStatus | null> {
    return this.apiService
      .get<ApiResponse<CustomerTicketStatus | null>>(this.customerStatusUrl)
      .pipe(map(res => res.data));
  }
}
