import { IncidentStatus, IncidentSeverity } from '../../../../admin/data-access/models/admin.models';

export interface ManagementIncidentImpactDto {
  incidentId: string;
  incidentCode: string;
  serviceName: string;
  apiPath: string;
  httpMethod: string;
  statusCode: number;
  occurredAt: string;
  firstOccurredAt: string; // Thời điểm xảy ra lần đầu tiên
  resolvedAt: string | null;
  status: IncidentStatus;
  durationMinutes: number;

  actualRevenue: number;
  expectedRevenue: number;
  revenueLoss: number;

  actualOrders: number;
  expectedOrders: number;
  lostOrders: number;

  affectedUsers: number;
  severity: IncidentSeverity;
  aiSummary: string | null;
  topAffectedUsers?: AffectedUserDetail[];
}

export interface ManagementImpactDashboardDto {
  totalLostRevenue: number;
  totalLostOrders: number;
  totalAffectedUsers: number;
  totalIncidentsCount: number;
  criticalIncidentsCount: number;
  highIncidentsCount: number;
  mediumIncidentsCount: number;
  lowIncidentsCount: number;
}

export interface AffectedUserDetail {
  userId: string | null;
  email: string;
  fullName: string;
  traceId: string;
  lastEventAt: string;
  lastEventUrl: string;
  avatarUrl?: string | null;
}
