export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export interface SystemLog {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  details: string;
  traceId?: string;
}

export enum LogServiceCategory {
  ALL = 'ALL',
  BACKEND = 'BACKEND',
  FRONTEND = 'FRONTEND',
  AI_SERVICE = 'AI-SERVICE',
}

export enum IncidentStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
}

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface SystemIncident {
  id: string;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  reportedAt: Date;
  resolvedAt?: Date;
  assignee: string;
  description: string;
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketMessageSender {
  CUSTOMER = 'CUSTOMER',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
}

export interface TicketMessage {
  id: string;
  sender: TicketMessageSender;
  content: string;
  timestamp: Date;
}

export interface SupportTicket {
  id: string;
  subject: string;
  customerName: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: Date;
  messages: TicketMessage[];
}

export enum AdminAccountRole {
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  CUSTOMER = 'CUSTOMER',
}

export interface AdminAccount {
  id: string;
  email: string;
  fullName: string;
  roles: AdminAccountRole[];
  active: boolean;
  lastLogin: Date;
}

export interface ActivityLog {
  id: string;
  operatorEmail: string;
  operatorFullName: string;
  operatorAvatar?: string;
  area?: ActivityArea;
  module?: string;
  action: string;
  actionLabel?: string;
  severity?: ActivitySeverity;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  target: string;
  summary?: string;
  metadata?: string;
  ipAddress: string;
  userAgent?: string;
  traceId?: string;
  timestamp: Date;
}

export enum ActivityArea {
  CUSTOMER = 'CUSTOMER',
  MANAGEMENT = 'MANAGEMENT',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

export enum ActivitySeverity {
  INFO = 'INFO',
  IMPORTANT = 'IMPORTANT',
  SECURITY = 'SECURITY',
  CRITICAL = 'CRITICAL',
}

export interface ActivityLogRecordPayload {
  action: string;
  area: ActivityArea;
  severity: ActivitySeverity;
  module?: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  summary?: string;
  metadata?: string;
}

export interface PermissionItem {
  id: string;
  moduleName: string;
  description: string;
  rolesAllowed: Record<AdminAccountRole, boolean>;
}

export interface PaginatedResult<T> {
  content: T[];
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
