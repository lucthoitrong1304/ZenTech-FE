import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState, withHooks } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, forkJoin, pipe, switchMap, tap, Subscription } from 'rxjs';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AdminLogsService } from '../services/admin-logs.service';
import { AdminIncidentsService } from '../../incidents/data-access/services/admin-incidents.service';
import { AdminTicketsService } from '../../tickets/data-access/services/admin-tickets.service';
import { WebsocketService } from '../../../../core/services/websocket.service';
import {
  LogLevel,
  SystemLog,
  IncidentStatus,
  IncidentSeverity,
  SystemIncident,
  TicketPriority,
  TicketStatus,
  TicketMessageSender,
  TicketMessage,
  SupportTicket,
  AdminAccountRole,
  AdminAccount,
  ActivityLog,
  ActivityLogRecordPayload,
  PermissionItem,
  PaginatedResult
} from '../models/admin.models';

interface AdminState {
  logs: SystemLog[];
  issueLogs: SystemLog[];
  isLoadingLogs: boolean;
  incidents: SystemIncident[];
  tickets: SupportTicket[];
  accounts: AdminAccount[];
  activityLogs: ActivityLog[];
  totalActivityLogs: number;
  activityPage: number;
  activitySize: number;
  isLoadingActivityLogs: boolean;
  permissions: PermissionItem[];
  logFilter: LogLevel | 'ALL';
  logSearch: string;
  incidentFilter: IncidentStatus | 'ALL';
  ticketFilter: TicketStatus | 'ALL';
  accountSearch: string;
  activitySearch: string;
  activityArea: string;
  activitySeverity: string;
  activityModule: string;
  activityAction: string;
  activityModulesList: string[];
  activityActionsList: string[];
  // Advanced filters
  incidentSearch: string;
  incidentSeverityFilter: IncidentSeverity | 'ALL';
  incidentStartDate: string | null;
  incidentEndDate: string | null;
  ticketSearch: string;
  ticketPriorityFilter: TicketPriority | 'ALL';
  ticketStartDate: string | null;
  ticketEndDate: string | null;
}


const mockLogs: SystemLog[] = [
  {
    id: 'LOG-001',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    level: LogLevel.INFO,
    category: 'AUTH',
    message: 'Khởi tạo phiên làm việc thành công cho admin@zentech.local',
    details: 'User Agent: Mozilla/5.0, IP Address: 192.168.1.50, Region: VN'
  },
  {
    id: 'LOG-002',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    level: LogLevel.DEBUG,
    category: 'DATABASE',
    message: 'Truy vấn sản phẩm: SELECT * FROM product WHERE active = true',
    details: 'Thời gian phản hồi: 14ms, Số dòng trả về: 36'
  },
  {
    id: 'LOG-003',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    level: LogLevel.ERROR,
    category: 'API',
    message: 'Lỗi kết nối tới cổng thanh toán Momo: Timeout',
    details: 'Đường dẫn gọi: https://api.momo.vn/v2/gateway/pay, Trạng thái: 504 Gateway Timeout'
  },
  {
    id: 'LOG-004',
    timestamp: new Date(Date.now() - 1.2 * 60 * 60 * 1000),
    level: LogLevel.WARN,
    category: 'SYSTEM',
    message: 'Cảnh báo tài nguyên RAM hệ thống quá tải (87%)',
    details: 'Dung lượng trống: 1.04GB trên tổng 8GB. Đề xuất: Giải phóng cache'
  },
  {
    id: 'LOG-005',
    timestamp: new Date(Date.now() - 1.8 * 60 * 60 * 1000),
    level: LogLevel.INFO,
    category: 'AI',
    message: 'Phản hồi tư vấn Chatbot AI thành công cho Customer ID: 9942',
    details: 'Model: gpt-4o-mini, Token gửi: 312, Token nhận: 142, Thời gian xử lý: 1.24s'
  },
  {
    id: 'LOG-006',
    timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
    level: LogLevel.ERROR,
    category: 'SYSTEM',
    message: 'Không thể ghi ảnh đại diện người dùng lên Object Storage R2',
    details: 'Lỗi: Access Denied. Bucket: zentech-avatars, Key: customer_948.png'
  },
  {
    id: 'LOG-007',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    level: LogLevel.INFO,
    category: 'AUTH',
    message: 'Tài khoản owner@zentech.local đăng nhập thành công',
    details: 'IP: 27.72.105.12, Trình duyệt: Chrome 124.0'
  },
  {
    id: 'LOG-008',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
    level: LogLevel.WARN,
    category: 'API',
    message: 'API lấy lịch làm việc nhân viên mất nhiều thời gian hơn bình thường (1250ms)',
    details: 'Đường dẫn gọi: /api/management/work-schedules?week=23, Cảnh báo: Slow Response'
  }
];

// Mock data removed in favor of real API integration

const mockAccounts: AdminAccount[] = [
  {
    id: 'ACC-001',
    email: 'admin@zentech.local',
    fullName: 'ZenTech Admin',
    roles: [AdminAccountRole.ADMIN],
    active: true,
    lastLogin: new Date(Date.now() - 5 * 60 * 1000)
  },
  {
    id: 'ACC-002',
    email: 'owner@zentech.local',
    fullName: 'ZenTech Owner',
    roles: [AdminAccountRole.OWNER],
    active: true,
    lastLogin: new Date(Date.now() - 4 * 60 * 60 * 1000)
  },
  {
    id: 'ACC-003',
    email: 'manager@zentech.local',
    fullName: 'Nguyễn Đình Manager',
    roles: [AdminAccountRole.MANAGER],
    active: true,
    lastLogin: new Date(Date.now() - 12 * 60 * 60 * 1000)
  },
  {
    id: 'ACC-004',
    email: 'employee@zentech.local',
    fullName: 'Phạm Văn Nhân Viên',
    roles: [AdminAccountRole.EMPLOYEE],
    active: true,
    lastLogin: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'ACC-005',
    email: 'khachhang1@gmail.com',
    fullName: 'Lê Văn Khách',
    roles: [AdminAccountRole.CUSTOMER],
    active: true,
    lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'ACC-006',
    email: 'khoatk123@gmail.com',
    fullName: 'Tài Khoản Bị Khóa',
    roles: [AdminAccountRole.CUSTOMER],
    active: false,
    lastLogin: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
  }
];

const mockActivityLogs: ActivityLog[] = [
  {
    id: 'ACT-001',
    operatorEmail: 'admin@zentech.local',
    operatorFullName: 'Lục Nhật Bạch',
    action: 'Thay đổi ma trận phân quyền',
    target: 'Quyền module Giám sát Hệ thống của MANAGER',
    ipAddress: '192.168.1.100',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000)
  },
  {
    id: 'ACT-002',
    operatorEmail: 'owner@zentech.local',
    operatorFullName: 'Trần Thế Minh',
    action: 'Cập nhật giá sản phẩm',
    target: 'Bàn phím cơ Keychron K8 Pro (2,500,000đ -> 2,350,000đ)',
    ipAddress: '27.72.105.12',
    timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000)
  },
  {
    id: 'ACT-003',
    operatorEmail: 'admin@zentech.local',
    operatorFullName: 'Lục Nhật Bạch',
    action: 'Khóa tài khoản người dùng',
    target: 'khoatk123@gmail.com',
    ipAddress: '192.168.1.100',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000)
  },
  {
    id: 'ACT-004',
    operatorEmail: 'manager@zentech.local',
    operatorFullName: 'Nguyễn Văn Nam',
    action: 'Phân ca làm việc tuần mới',
    target: 'Tuần 23 - Bộ phận Kinh doanh',
    ipAddress: '192.168.1.112',
    timestamp: new Date(Date.now() - 1.1 * 24 * 60 * 60 * 1000)
  }
];

const mockPermissions: PermissionItem[] = [
  {
    id: 'PERM-01',
    moduleName: 'Quản lý Đơn hàng',
    description: 'Xem, cập nhật trạng thái đơn hàng, hoàn tiền cho khách',
    rolesAllowed: {
      [AdminAccountRole.ADMIN]: true,
      [AdminAccountRole.OWNER]: true,
      [AdminAccountRole.MANAGER]: true,
      [AdminAccountRole.EMPLOYEE]: true,
      [AdminAccountRole.CUSTOMER]: false
    }
  },
  {
    id: 'PERM-02',
    moduleName: 'Quản lý Sản phẩm',
    description: 'Thêm, sửa, xóa, quản lý nhóm sản phẩm, cấu hình tồn kho',
    rolesAllowed: {
      [AdminAccountRole.ADMIN]: true,
      [AdminAccountRole.OWNER]: true,
      [AdminAccountRole.MANAGER]: true,
      [AdminAccountRole.EMPLOYEE]: true,
      [AdminAccountRole.CUSTOMER]: false
    }
  },
  {
    id: 'PERM-03',
    moduleName: 'Cấu hình Khuyến mãi',
    description: 'Tạo mã voucher, chương trình marketing, chiến dịch giảm giá',
    rolesAllowed: {
      [AdminAccountRole.ADMIN]: true,
      [AdminAccountRole.OWNER]: true,
      [AdminAccountRole.MANAGER]: true,
      [AdminAccountRole.EMPLOYEE]: false,
      [AdminAccountRole.CUSTOMER]: false
    }
  },
  {
    id: 'PERM-04',
    moduleName: 'Giám sát Hệ thống',
    description: 'Xem log hệ thống, theo dõi sự cố máy chủ, giám sát hiệu năng',
    rolesAllowed: {
      [AdminAccountRole.ADMIN]: true,
      [AdminAccountRole.OWNER]: false,
      [AdminAccountRole.MANAGER]: false,
      [AdminAccountRole.EMPLOYEE]: false,
      [AdminAccountRole.CUSTOMER]: false
    }
  },
  {
    id: 'PERM-05',
    moduleName: 'Nhật ký Hoạt động (Audit log)',
    description: 'Xem chi tiết các thao tác nhạy cảm của các vai trò trong hệ thống',
    rolesAllowed: {
      [AdminAccountRole.ADMIN]: true,
      [AdminAccountRole.OWNER]: true,
      [AdminAccountRole.MANAGER]: false,
      [AdminAccountRole.EMPLOYEE]: false,
      [AdminAccountRole.CUSTOMER]: false
    }
  }
];

const initialState: AdminState = {
  logs: [],
  issueLogs: [],
  isLoadingLogs: false,
  incidents: [],
  tickets: [],
  accounts: mockAccounts,
  activityLogs: [],
  totalActivityLogs: 0,
  activityPage: 0,
  activitySize: 10,
  isLoadingActivityLogs: false,
  permissions: mockPermissions,
  logFilter: 'ALL',
  logSearch: '',
  incidentFilter: 'ALL',
  ticketFilter: 'ALL',
  accountSearch: '',
  activitySearch: '',
  activityArea: 'ALL',
  activitySeverity: 'ALL',
  activityModule: 'ALL',
  activityAction: 'ALL',
  activityModulesList: [],
  activityActionsList: [],
  // Initialize advanced filters
  incidentSearch: '',
  incidentSeverityFilter: 'ALL',
  incidentStartDate: null,
  incidentEndDate: null,
  ticketSearch: '',
  ticketPriorityFilter: 'ALL',
  ticketStartDate: null,
  ticketEndDate: null
};

export const AdminStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({
    logs, issueLogs, logFilter, logSearch,
    incidents, incidentFilter, incidentSearch, incidentSeverityFilter, incidentStartDate, incidentEndDate,
    tickets, ticketFilter, ticketSearch, ticketPriorityFilter, ticketStartDate, ticketEndDate,
    accounts, accountSearch, activityLogs, activitySearch
  }) => ({
    filteredLogs: computed(() => {
      let result = logs();
      const filterVal = logFilter();
      const searchVal = logSearch().toLowerCase().trim();

      if (filterVal !== 'ALL') {
        result = result.filter(log => log.level === filterVal);
      }
      if (searchVal) {
        result = result.filter(log =>
          log.message.toLowerCase().includes(searchVal) ||
          log.category.toLowerCase().includes(searchVal) ||
          log.details.toLowerCase().includes(searchVal)
        );
      }
      return result;
    }),

    filteredIssueLogs: computed(() => {
      const searchVal = logSearch().toLowerCase().trim();
      let result = issueLogs();

      if (searchVal) {
        result = result.filter(log =>
          log.message.toLowerCase().includes(searchVal) ||
          log.category.toLowerCase().includes(searchVal) ||
          log.details.toLowerCase().includes(searchVal)
        );
      }

      return result;
    }),

    filteredIncidents: computed(() => {
      let result = incidents();
      const filterVal = incidentFilter();
      const searchVal = incidentSearch().toLowerCase().trim();
      const severityVal = incidentSeverityFilter();
      const startVal = incidentStartDate();
      const endVal = incidentEndDate();

      if (filterVal !== 'ALL') {
        result = result.filter(inc => inc.status === filterVal);
      }
      if (severityVal !== 'ALL') {
        result = result.filter(inc => inc.severity === severityVal);
      }
      if (searchVal) {
        result = result.filter(inc =>
          inc.code.toLowerCase().includes(searchVal) ||
          (inc.errorMessage && inc.errorMessage.toLowerCase().includes(searchVal)) ||
          (inc.apiPath && inc.apiPath.toLowerCase().includes(searchVal)) ||
          (inc.serviceName && inc.serviceName.toLowerCase().includes(searchVal)) ||
          (inc.userEmail && inc.userEmail.toLowerCase().includes(searchVal)) ||
          (inc.assignee && inc.assignee.toLowerCase().includes(searchVal))
        );
      }
      if (startVal) {
        const startDate = new Date(startVal);
        startDate.setHours(0, 0, 0, 0);
        result = result.filter(inc => new Date(inc.reportedAt).getTime() >= startDate.getTime());
      }
      if (endVal) {
        const endDate = new Date(endVal);
        endDate.setHours(23, 59, 59, 999);
        result = result.filter(inc => new Date(inc.reportedAt).getTime() <= endDate.getTime());
      }

      return result.sort((a, b) => {
        if (a.status === IncidentStatus.OPEN && b.status !== IncidentStatus.OPEN) return -1;
        if (a.status !== IncidentStatus.OPEN && b.status === IncidentStatus.OPEN) return 1;
        return b.reportedAt.getTime() - a.reportedAt.getTime();
      });
    }),

    filteredTickets: computed(() => {
      let result = tickets();
      const filterVal = ticketFilter();
      const searchVal = ticketSearch().toLowerCase().trim();
      const priorityVal = ticketPriorityFilter();
      const startVal = ticketStartDate();
      const endVal = ticketEndDate();

      if (filterVal !== 'ALL') {
        result = result.filter(tck => tck.status === filterVal);
      }
      if (priorityVal !== 'ALL') {
        result = result.filter(tck => tck.priority === priorityVal);
      }
      if (searchVal) {
        result = result.filter(tck =>
          (tck.code && tck.code.toLowerCase().includes(searchVal)) ||
          tck.id.toLowerCase().includes(searchVal) ||
          tck.subject.toLowerCase().includes(searchVal) ||
          tck.customerName.toLowerCase().includes(searchVal) ||
          (tck.createdByEmail && tck.createdByEmail.toLowerCase().includes(searchVal)) ||
          (tck.assigneeName && tck.assigneeName.toLowerCase().includes(searchVal))
        );
      }
      if (startVal) {
        const startDate = new Date(startVal);
        startDate.setHours(0, 0, 0, 0);
        result = result.filter(tck => new Date(tck.createdAt).getTime() >= startDate.getTime());
      }
      if (endVal) {
        const endDate = new Date(endVal);
        endDate.setHours(23, 59, 59, 999);
        result = result.filter(tck => new Date(tck.createdAt).getTime() <= endDate.getTime());
      }

      return result.sort((a, b) => {
        if (a.status === TicketStatus.OPEN && b.status !== TicketStatus.OPEN) return -1;
        if (a.status !== TicketStatus.OPEN && b.status === TicketStatus.OPEN) return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }),


    filteredAccounts: computed(() => {
      let result = accounts();
      const searchVal = accountSearch().toLowerCase().trim();

      if (searchVal) {
        result = result.filter(acc =>
          acc.fullName.toLowerCase().includes(searchVal) ||
          acc.email.toLowerCase().includes(searchVal)
        );
      }
      return result;
    }),

    filteredActivityLogs: computed(() => {
      return activityLogs();
    }),

    unresolvedIncidentsCount: computed(() => {
      return incidents().filter(inc => inc.status !== IncidentStatus.RESOLVED).length;
    }),

    openTicketsCount: computed(() => {
      return tickets().filter(tck => tck.status === TicketStatus.OPEN || tck.status === TicketStatus.IN_PROGRESS).length;
    }),

    totalErrorsCount: computed(() => {
      return logs().filter(log => log.level === LogLevel.ERROR).length;
    })
  })),
  withMethods((
    store,
    toastService = inject(ToastService),
    adminLogsService = inject(AdminLogsService),
    adminIncidentsService = inject(AdminIncidentsService),
    adminTicketsService = inject(AdminTicketsService),
    wsService = inject(WebsocketService)
  ) => {
    let incidentSubscription: Subscription | null = null;
    let ticketSubscription: Subscription | null = null;

    // Helper to log audit actions dynamically
    const logActivity = (action: string, target: string) => {
      const newAudit: ActivityLog = {
        id: `ACT-${Math.floor(100 + Math.random() * 900)}`,
        operatorEmail: 'admin@zentech.local',
        operatorFullName: 'Lục Nhật Bạch',
        action,
        target,
        ipAddress: '192.168.1.50',
        timestamp: new Date()
      };
      patchState(store, (state) => ({
        activityLogs: [newAudit, ...state.activityLogs]
      }));
    };

    return {
      loadIncidents: rxMethod<{ status?: IncidentStatus }>(
        pipe(
          switchMap(({ status }) =>
            adminIncidentsService.getIncidents(status).pipe(
              tap((res) => {
                const mappedIncidents = res.data.map((inc: any) => ({
                  id: inc.id,
                  code: inc.code,
                  title: `Sự cố ${inc.code}: ${inc.errorMessage || 'Lỗi hệ thống'}`,
                  description: `API: ${inc.httpMethod} ${inc.apiPath} (Mã lỗi: ${inc.statusCode})`,
                  status: inc.status,
                  severity: inc.severity,
                  reportedAt: inc.occurredAt ? new Date(inc.occurredAt) : (inc.createdAt ? new Date(inc.createdAt) : new Date()),
                  resolvedAt: inc.resolvedAt ? new Date(inc.resolvedAt) : undefined,
                  assignee: inc.assignee,
                  traceId: inc.traceId,
                  serviceName: inc.serviceName,
                  apiPath: inc.apiPath,
                  httpMethod: inc.httpMethod,
                  statusCode: inc.statusCode,
                  errorMessage: inc.errorMessage,
                  stackTrace: inc.stackTrace,
                  aiAnalysis: inc.aiAnalysis,
                  ticketCode: inc.ticketCode
                }));
                patchState(store, { incidents: mappedIncidents });
              }),
              catchError((err) => {
                console.error(err);
                toastService.error('Không thể tải danh sách sự cố');
                return EMPTY;
              })
            )
          )
        )
      ),

      loadTickets: rxMethod<{ status?: TicketStatus }>(
        pipe(
          switchMap(({ status }) =>
            adminTicketsService.getTickets(status).pipe(
              tap((res) => {
                const mappedTickets = res.data.map((tck: any) => ({
                  id: tck.id,
                  code: tck.code,
                  incidentId: tck.incidentId,
                  incidentCode: tck.incidentCode,
                  subject: tck.title,
                  customerName: tck.createdByName || tck.createdByEmail || 'Hệ thống',
                  priority: tck.priority,
                  status: tck.status,
                  createdAt: new Date(tck.createdAt),
                  resolvedAt: tck.resolvedAt ? new Date(tck.resolvedAt) : undefined,
                  createdByEmail: tck.createdByEmail,
                  createdByName: tck.createdByName,
                  assigneeName: tck.assigneeName,
                  assigneeEmail: tck.assigneeEmail,
                  messages: tck.messages ? tck.messages.map((m: any) => ({
                    id: m.id,
                    sender: m.sender,
                    content: m.content,
                    timestamp: new Date(m.timestamp)
                  })) : []
                }));
                patchState(store, { tickets: mappedTickets });
              }),
              catchError((err) => {
                console.error(err);
                toastService.error('Không thể tải danh sách Ticket hỗ trợ');
                return EMPTY;
              })
            )
          )
        )
      ),
      loadActivityLogs: rxMethod<{
        page: number;
        size: number;
        search: string;
        area: string;
        severity: string;
        module: string;
        action: string;
      }>(
        pipe(
          tap(() => patchState(store, { isLoadingActivityLogs: true })),
          switchMap(({ page, size, search, area, severity, module, action }) =>
            adminLogsService.getActivityLogs(page, size, search, area, severity, module, action).pipe(
              tap((response) => {
                const res = response.data;
                const mappedLogs = res.content.map(log => ({
                  ...log,
                  timestamp: new Date(log.timestamp)
                }));
                patchState(store, {
                  activityLogs: mappedLogs,
                  totalActivityLogs: res.totalElements,
                  activityPage: res.page,
                  activitySize: res.size,
                  isLoadingActivityLogs: false
                });
              }),
              catchError((err) => {
                console.error(err);
                toastService.error('Không thể tải nhật ký hoạt động');
                patchState(store, { isLoadingActivityLogs: false });
                return EMPTY;
              })
            )
          )
        )
      ),

      loadActivityLogMetadata: rxMethod<void>(
        pipe(
          switchMap(() =>
            forkJoin([
              adminLogsService.getActivityLogModules(),
              adminLogsService.getActivityLogActions()
            ]).pipe(
              tap(([modulesRes, actionsRes]) => {
                patchState(store, {
                  activityModulesList: modulesRes.data,
                  activityActionsList: actionsRes.data
                });
              }),
              catchError((err) => {
                console.error('Failed to load activity logs metadata', err);
                return EMPTY;
              })
            )
          )
        )
      ),

      loadLogs: rxMethod<{ level: string; search: string; traceId: string }>(
        pipe(
          tap(() => patchState(store, { isLoadingLogs: true })),
          switchMap(({ level, search, traceId }) =>
            adminLogsService.getLogs(level, search, traceId).pipe(
              tap((logs) => {
                patchState(store, { logs, isLoadingLogs: false });
              }),
              catchError((err) => {
                console.error(err);
                toastService.error('Không thể tải nhật ký hệ thống');
                patchState(store, { isLoadingLogs: false });
                return EMPTY;
              })
            )
          )
        )
      ),

      loadIssueLogs: rxMethod<{ search: string; traceId: string }>(
        pipe(
          switchMap(({ search, traceId }) =>
            forkJoin([
              adminLogsService.getLogs(LogLevel.WARN, search, traceId, 500),
              adminLogsService.getLogs(LogLevel.ERROR, search, traceId, 500),
            ]).pipe(
              tap(([warnLogs, errorLogs]) => {
                patchState(store, { issueLogs: [...warnLogs, ...errorLogs] });
              }),
              catchError((err) => {
                console.error(err);
                toastService.error('Không thể tải danh sách issue');
                return EMPTY;
              })
            )
          )
        )
      ),

      explainLog(
        logMessage: string,
        logDetails: string,
        service: string,
        onSuccess: (explanation: string) => void,
        onError: () => void
      ) {
        adminLogsService.explainLog(logMessage, logDetails, service).subscribe({
          next: (res) => onSuccess(res.explanation),
          error: (err) => {
            console.error(err);
            toastService.error('Không thể gọi AI phân tích lỗi');
            onError();
          }
        });
      },

      recordActivityLog(payload: ActivityLogRecordPayload) {
        adminLogsService.recordActivityLog(payload).subscribe({
          error: (err) => console.error(err)
        });
      },

      prependRealtimeActivityLog(logItem: ActivityLog) {
        patchState(store, (state) => {
          if (state.activityLogs.some(log => log.id === logItem.id)) {
            return state;
          }

          return {
            activityLogs: [logItem, ...state.activityLogs].slice(0, state.activitySize),
            totalActivityLogs: state.totalActivityLogs + 1
          };
        });
      },

      setLogFilter(filter: LogLevel | 'ALL') {
        patchState(store, { logFilter: filter });
        this.loadLogs({ level: filter, search: store.logSearch(), traceId: '' });
      },

      setLogSearch(search: string) {
        patchState(store, { logSearch: search });
        this.loadLogs({ level: store.logFilter(), search, traceId: '' });
      },

      setIncidentFilter(filter: IncidentStatus | 'ALL') {
        patchState(store, { incidentFilter: filter });
      },

      setIncidentSearch(search: string) {
        patchState(store, { incidentSearch: search });
      },

      setIncidentSeverityFilter(severity: IncidentSeverity | 'ALL') {
        patchState(store, { incidentSeverityFilter: severity });
      },

      setIncidentDateRange(start: string | null, end: string | null) {
        patchState(store, { incidentStartDate: start, incidentEndDate: end });
      },

      resetIncidentFilters() {
        patchState(store, {
          incidentFilter: 'ALL',
          incidentSearch: '',
          incidentSeverityFilter: 'ALL',
          incidentStartDate: null,
          incidentEndDate: null
        });
      },

      setTicketFilter(filter: TicketStatus | 'ALL') {
        patchState(store, { ticketFilter: filter });
      },

      setTicketSearch(search: string) {
        patchState(store, { ticketSearch: search });
      },

      setTicketPriorityFilter(priority: TicketPriority | 'ALL') {
        patchState(store, { ticketPriorityFilter: priority });
      },

      setTicketDateRange(start: string | null, end: string | null) {
        patchState(store, { ticketStartDate: start, ticketEndDate: end });
      },

      resetTicketFilters() {
        patchState(store, {
          ticketFilter: 'ALL',
          ticketSearch: '',
          ticketPriorityFilter: 'ALL',
          ticketStartDate: null,
          ticketEndDate: null
        });
      },

      setAccountSearch(search: string) {
        patchState(store, { accountSearch: search });
      },

      setActivitySearch(search: string) {
        patchState(store, { activitySearch: search, activityPage: 0 });
        this.loadActivityLogs({
          page: 0,
          size: store.activitySize(),
          search,
          area: store.activityArea(),
          severity: store.activitySeverity(),
          module: store.activityModule(),
          action: store.activityAction()
        });
      },

      setActivityPage(page: number) {
        patchState(store, { activityPage: page });
        this.loadActivityLogs({
          page,
          size: store.activitySize(),
          search: store.activitySearch(),
          area: store.activityArea(),
          severity: store.activitySeverity(),
          module: store.activityModule(),
          action: store.activityAction()
        });
      },

      setActivitySize(size: number) {
        patchState(store, { activitySize: size, activityPage: 0 });
        this.loadActivityLogs({
          page: 0,
          size,
          search: store.activitySearch(),
          area: store.activityArea(),
          severity: store.activitySeverity(),
          module: store.activityModule(),
          action: store.activityAction()
        });
      },

      setActivityArea(area: string) {
        patchState(store, { activityArea: area, activityPage: 0 });
        this.loadActivityLogs({
          page: 0,
          size: store.activitySize(),
          search: store.activitySearch(),
          area,
          severity: store.activitySeverity(),
          module: store.activityModule(),
          action: store.activityAction()
        });
      },

      setActivitySeverity(severity: string) {
        patchState(store, { activitySeverity: severity, activityPage: 0 });
        this.loadActivityLogs({
          page: 0,
          size: store.activitySize(),
          search: store.activitySearch(),
          area: store.activityArea(),
          severity,
          module: store.activityModule(),
          action: store.activityAction()
        });
      },

      setActivityModule(module: string) {
        patchState(store, { activityModule: module, activityPage: 0 });
        this.loadActivityLogs({
          page: 0,
          size: store.activitySize(),
          search: store.activitySearch(),
          area: store.activityArea(),
          severity: store.activitySeverity(),
          module,
          action: store.activityAction()
        });
      },

      setActivityAction(action: string) {
        patchState(store, { activityAction: action, activityPage: 0 });
        this.loadActivityLogs({
          page: 0,
          size: store.activitySize(),
          search: store.activitySearch(),
          area: store.activityArea(),
          severity: store.activitySeverity(),
          module: store.activityModule(),
          action
        });
      },

      appendLog(logItem: SystemLog) {
        patchState(store, (state) => {
          if (state.logs.some(l => l.id === logItem.id)) {
            return state;
          }
          return {
            logs: [logItem, ...state.logs].slice(0, 1000)
          };
        });
      },

      clearLogs() {
        patchState(store, { logs: [] });
        logActivity('Xóa log hệ thống', 'Tất cả logs hoạt động');
        toastService.success('Đã xóa sạch nhật ký hệ thống');
      },

      updateIncident(id: string, status: IncidentStatus, severity: IncidentSeverity, assignee?: string) {
        adminIncidentsService.updateIncidentStatus(id, { status, severity, assignee }).subscribe({
          next: () => {
            logActivity(`Cập nhật sự cố ${id}`, `Trạng thái: ${status}, Mức độ: ${severity}`);
            toastService.success(`Đã cập nhật sự cố ${id} thành công`);
            this.loadIncidents({ status: store.incidentFilter() === 'ALL' ? undefined : store.incidentFilter() as IncidentStatus });
          },
          error: (err) => {
            console.error(err);
            toastService.error('Không thể cập nhật sự cố');
          }
        });
      },

      addTicketMessage(ticketId: string, content: string) {
        adminTicketsService.sendReply(ticketId, content).subscribe({
          next: () => {
            logActivity(`Phản hồi Ticket ${ticketId}`, `Nội dung: ${content.substring(0, 30)}...`);
            this.loadTickets({ status: store.ticketFilter() === 'ALL' ? undefined : store.ticketFilter() as TicketStatus });
          },
          error: (err) => {
            console.error(err);
            toastService.error('Không thể gửi phản hồi Ticket');
          }
        });
      },

      updateTicketStatus(ticketId: string, status: TicketStatus) {
        adminTicketsService.updateTicketStatus(ticketId, status).subscribe({
          next: () => {
            logActivity(`Cập nhật Ticket ${ticketId}`, `Trạng thái mới: ${status}`);
            toastService.success(`Đã chuyển trạng thái Ticket thành ${status}`);
            this.loadTickets({ status: store.ticketFilter() === 'ALL' ? undefined : store.ticketFilter() as TicketStatus });
            this.loadIncidents({ status: store.incidentFilter() === 'ALL' ? undefined : store.incidentFilter() as IncidentStatus });
          },
          error: (err) => {
            console.error(err);
            toastService.error('Không thể cập nhật trạng thái Ticket');
          }
        });
      },

      analyzeIncident(id: string, onSuccess: (analysis: any) => void, onError: () => void) {
        adminIncidentsService.analyzeIncident(id).subscribe({
          next: (res) => {
            logActivity(`Phân tích AI sự cố`, id);
            toastService.success('Đã hoàn thành phân tích AI');
            this.loadIncidents({ status: store.incidentFilter() === 'ALL' ? undefined : store.incidentFilter() as IncidentStatus });
            onSuccess(res.data);
          },
          error: (err) => {
            console.error(err);
            toastService.error('Phân tích AI thất bại');
            onError();
          }
        });
      },

      createTicketFromIncident(payload: { title: string; description: string; priority: string; status: TicketStatus; incidentId: string }, onSuccess: () => void) {
        adminTicketsService.createTicket(payload).subscribe({
          next: () => {
            logActivity(`Tạo Ticket cho sự cố`, payload.incidentId);
            toastService.success('Đã tạo thành công Ticket hỗ trợ');
            this.loadTickets({ status: store.ticketFilter() === 'ALL' ? undefined : store.ticketFilter() as TicketStatus });
            this.loadIncidents({ status: store.incidentFilter() === 'ALL' ? undefined : store.incidentFilter() as IncidentStatus });
            onSuccess();
          },
          error: (err) => {
            console.error(err);
            toastService.error('Không thể tạo Ticket hỗ trợ');
          }
        });
      },

      addAccount(fullName: string, email: string, role: AdminAccountRole) {
        const newAccount: AdminAccount = {
          id: `ACC-${Math.floor(100 + Math.random() * 900)}`,
          email,
          fullName,
          roles: [role],
          active: true,
          lastLogin: new Date()
        };

        patchState(store, (state) => ({
          accounts: [...state.accounts, newAccount]
        }));

        logActivity('Tạo tài khoản mới', `${email} với quyền ${role}`);
        toastService.success(`Đã thêm thành công tài khoản ${email}`);
      },

      updateAccount(id: string, fullName: string, email: string, role: AdminAccountRole, active: boolean) {
        patchState(store, (state) => {
          const updatedAccounts = state.accounts.map(acc => {
            if (acc.id === id) {
              return { ...acc, fullName, email, roles: [role], active };
            }
            return acc;
          });
          return { accounts: updatedAccounts };
        });

        logActivity(`Cập nhật tài khoản`, `${email} (Kích hoạt: ${active})`);
        toastService.success(`Đã cập nhật thông tin tài khoản ${email}`);
      },

      togglePermission(permissionId: string, role: AdminAccountRole) {
        patchState(store, (state) => {
          const updatedPermissions = state.permissions.map(perm => {
            if (perm.id === permissionId) {
              const currentVal = perm.rolesAllowed[role];
              return {
                ...perm,
                rolesAllowed: {
                  ...perm.rolesAllowed,
                  [role]: !currentVal
                }
              };
            }
            return perm;
          });
          return { permissions: updatedPermissions };
        });

        logActivity('Thay đổi cấu hình phân quyền', `Quyền ${permissionId} cho vai trò ${role}`);
        toastService.success('Đã cập nhật ma trận phân quyền hệ thống');
      },

      initWebSocket() {
        wsService.connect();

        if (incidentSubscription) {
          incidentSubscription.unsubscribe();
        }
        incidentSubscription = wsService.subscribe<any>('/topic/admin.incidents')
          .subscribe({
            next: (incident) => {
              toastService.success(`Hệ thống ghi nhận sự cố mới: ${incident.code}`);
              const activeFilter = store.incidentFilter();
              this.loadIncidents({ status: activeFilter === 'ALL' ? undefined : activeFilter as IncidentStatus });
            },
            error: (err) => console.error('[Incident WS Error]', err)
          });

        if (ticketSubscription) {
          ticketSubscription.unsubscribe();
        }
        ticketSubscription = wsService.subscribe<any>('/topic/admin.tickets')
          .subscribe({
            next: (ticket) => {
              const activeFilter = store.ticketFilter();
              this.loadTickets({ status: activeFilter === 'ALL' ? undefined : activeFilter as TicketStatus });
              const activeIncFilter = store.incidentFilter();
              this.loadIncidents({ status: activeIncFilter === 'ALL' ? undefined : activeIncFilter as IncidentStatus });
            },
            error: (err) => console.error('[Ticket WS Error]', err)
          });
      },

      destroyWebSocket() {
        if (incidentSubscription) {
          incidentSubscription.unsubscribe();
          incidentSubscription = null;
        }
        if (ticketSubscription) {
          ticketSubscription.unsubscribe();
          ticketSubscription = null;
        }
      }
    };
  }),
  withHooks({
    onInit(store) {
      store.initWebSocket();
    },
    onDestroy(store) {
      store.destroyWebSocket();
    }
  })
);
