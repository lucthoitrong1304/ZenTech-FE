export type StatisticsPeriod = 'TODAY' | '7D' | '30D' | 'CUSTOM';

export interface StatisticsTrendPoint {
  key: string;
  label: string;
  total: number;
  warnings: number;
  errors: number;
}

export interface StatisticsApiError {
  method: string;
  endpoint: string;
  statusCode: number | null;
  errorCount: number;
  lastSeen: string;
}

export interface StatisticsServiceError {
  service: string;
  total: number;
  warnings: number;
  errors: number;
  lastSeen: string;
}

export interface StatisticsAffectedUser {
  userId: string | null;
  displayName: string;
  email: string | null;
  role: 'ADMIN' | 'OWNER' | 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER' | null;
  avatarUrl: string | null;
  errorCount: number;
  lastSeen: string;
  anonymous: boolean;
}

export interface AdminStatisticsData {
  period: StatisticsPeriod;
  from: string;
  to: string;
  generatedAt: string;
  logsAvailable: boolean;
  partialData: boolean;
  totalErrors: number;
  incidentsInPeriod: number;
  ticketsCreated: number;
  ticketsResolved: number;
  ticketResolutionRate: number;
  errorTrend: StatisticsTrendPoint[];
  topApis: StatisticsApiError[];
  topServices: StatisticsServiceError[];
  topAffectedUsers: StatisticsAffectedUser[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
}
