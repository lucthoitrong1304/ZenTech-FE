import { TicketPriority, TicketStatus } from '../../../../admin/data-access/models/admin.models';

export { TicketPriority, TicketStatus };

export interface ManagementTicket {
  id: string;
  code: string;
  incidentId?: string | null;
  incidentCode?: string | null;
  title: string;
  description?: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  assigneeId?: string | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  assigneeImageUrl?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  createdByEmail?: string | null;
  createdByImageUrl?: string | null;
  affectedUserEmails?: string[];
  createdAt: string;
  resolvedAt?: string | null;
  images?: string | null;
}

export interface ManagementTicketQuery {
  page: number;
  size: number;
  status: TicketStatus | 'ALL';
  priority: TicketPriority | 'ALL';
  assigneeEmail: string;
  customerEmail: string;
  search: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface ManagementTicketPage {
  content: ManagementTicket[];
  totalElements: number;
  totalPages: number;
  size: number;
  page: number;
  last: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CustomerTicketStatus {
  status: TicketStatus;
  message: string;
  updatedAt: string;
  resolvedAt?: string | null;
}
