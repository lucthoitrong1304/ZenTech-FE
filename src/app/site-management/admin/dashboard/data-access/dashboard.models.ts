export type DashboardPeriod = 'TODAY' | '7D' | '30D' | 'CUSTOM';
export type DashboardHealth = 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
export type ResourceStatus = 'AVAILABLE' | 'UNAVAILABLE';

export interface DashboardMetrics {
  issuesInPeriod: number;
  errorsInPeriod: number;
  openIncidents: number;
  highPriorityIncidents: number;
  unassignedIncidents: number;
  actionableTickets: number;
  unassignedTickets: number;
  staleTickets: number;
  incidentsCreatedInPeriod: number;
  incidentsResolvedInPeriod: number;
  incidentResolutionRate: number;
  averageResolutionMinutes: number;
}

export interface DashboardTrendPoint {
  key: string;
  label: string;
  issues: number;
  errors: number;
  incidentsCreated: number;
  incidentsResolved: number;
}

export interface DashboardIssue {
  signature: string;
  title: string;
  level: 'WARN' | 'ERROR';
  category: string;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
}

export interface DashboardIncident {
  id: string;
  code: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  serviceName?: string | null;
  apiPath?: string | null;
  assignee?: string | null;
  createdAt: string;
  firstOccurredAt?: string | null;
}

export interface DashboardTicket {
  id: string;
  code: string;
  title: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  createdAt: string;
}

export interface DashboardServiceError {
  service: string;
  occurrences: number;
  latestIssueTitle: string;
  lastSeen: string;
}

export interface AdminDashboardData {
  period: DashboardPeriod;
  from: string;
  to: string;
  health: DashboardHealth;
  generatedAt: string;
  logsAvailable: boolean;
  metrics: DashboardMetrics;
  trend: DashboardTrendPoint[];
  topIssues: DashboardIssue[];
  priorityIncidents: DashboardIncident[];
  priorityTickets: DashboardTicket[];
  topServices: DashboardServiceError[];
}

export interface AdminResourceMetrics {
  status: ResourceStatus;
  cpuUsagePercent: number | null;
  ramUsagePercent: number | null;
  diskUsagePercent: number | null;
  ramUsedBytes: number | null;
  ramTotalBytes: number | null;
  diskUsedBytes: number | null;
  diskTotalBytes: number | null;
  diskPath: string | null;
  generatedAt: string;
  message: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
}
