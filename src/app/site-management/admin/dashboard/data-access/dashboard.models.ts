export type DashboardPeriod = 'TODAY' | '7D' | '30D' | 'CUSTOM';
export type DashboardHealth = 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
export type ResourceStatus = 'AVAILABLE' | 'UNAVAILABLE';
export type ResourceMetricSource = 'PROMETHEUS' | 'DIRECT';

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
  errorOccurrences: number;
  warningOccurrences: number;
  latestIssueTitle: string;
  latestIssueLevel: 'WARN' | 'ERROR' | string;
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

export interface ResourceHistoryPoint {
  timestamp: string;
  cpuUsagePercent: number | null;
  ramUsagePercent: number | null;
  diskUsagePercent: number | null;
}

export interface AdminResourceMetrics {
  status: ResourceStatus;
  source: ResourceMetricSource;
  historyAvailable: boolean;
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
  history: ResourceHistoryPoint[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
}

export interface ObservabilityHealthOverview {
  cpuUsagePercent: number | null;
  cpuCoreCount: number | null;
  ramUsagePercent: number | null;
  ramUsedBytes: number | null;
  ramTotalBytes: number | null;
  diskUsagePercent: number | null;
  diskUsedBytes: number | null;
  diskTotalBytes: number | null;
  jvmHeapUsagePercent: number | null;
  jvmHeapUsedBytes: number | null;
  jvmHeapMaxBytes: number | null;
  processCpuUsagePercent: number | null;
  processUptimeSeconds: number | null;
  liveThreads: number | null;
  peakThreads: number | null;
}

export interface ObservabilityApiPerformance {
  requestsPerMinute: number | null;
  errorRatePercent: number | null;
  p95LatencyMs: number | null;
  averageLatencyMs: number | null;
  activeRequests: number | null;
}

export interface ObservabilityHistoryPoint extends ResourceHistoryPoint {
  jvmHeapUsagePercent: number | null;
  requestsPerMinute: number | null;
  errorRatePercent: number | null;
  p95LatencyMs: number | null;
}

export interface ObservabilityApiAnomaly {
  method: string;
  uri: string;
  status: string | null;
  value: number;
  unit: string;
}

export interface ObservabilityThresholdEvent {
  timestamp: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'WARNING' | 'CRITICAL';
}

export interface ObservabilityDependency {
  name: string;
  status: 'UP' | 'DEGRADED' | 'DOWN';
  detail: string;
  primaryValue: number | null;
  primaryUnit: string | null;
  secondaryValue: number | null;
  secondaryUnit: string | null;
}

export interface ObservabilityDependencyConfigItem {
  key: string;
  value: string;
  source: string;
  sensitive: boolean;
  editable: boolean;
}

export interface ObservabilityDependencyMetricItem {
  label: string;
  value: string;
  unit: string;
}

export interface ObservabilityDependencyDetail {
  name: string;
  group: string;
  status: 'UP' | 'DEGRADED' | 'DOWN';
  detail: string;
  endpoint: string;
  healthCheckPath: string;
  lastCheckedAt: string;
  configItems: ObservabilityDependencyConfigItem[];
  metrics: ObservabilityDependencyMetricItem[];
  notes: string[];
}

export interface AdminObservabilityData {
  period: DashboardPeriod;
  from: string;
  to: string;
  generatedAt: string;
  prometheusAvailable: boolean;
  health: ObservabilityHealthOverview;
  api: ObservabilityApiPerformance;
  history: ObservabilityHistoryPoint[];
  slowApis: ObservabilityApiAnomaly[];
  errorApis: ObservabilityApiAnomaly[];
  thresholdEvents: ObservabilityThresholdEvent[];
  dependencies: ObservabilityDependency[];
}
