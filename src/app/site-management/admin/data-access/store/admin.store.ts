import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, forkJoin, pipe, switchMap, tap } from 'rxjs';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AdminLogsService } from '../services/admin-logs.service';
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

const mockIncidents: SystemIncident[] = [
  {
    id: 'INC-001',
    title: 'Cổng thanh toán Momo mất kết nối',
    status: IncidentStatus.OPEN,
    severity: IncidentSeverity.CRITICAL,
    reportedAt: new Date(Date.now() - 45 * 60 * 1000),
    assignee: 'Trần Anh Tú',
    description: 'Khách hàng không thể thanh toán đơn hàng bằng ví điện tử Momo. API trả về mã lỗi 504. Đang kiểm tra lại API key và phía Momo.'
  },
  {
    id: 'INC-002',
    title: 'Độ trễ phản hồi của AI Chatbot tăng cao',
    status: IncidentStatus.INVESTIGATING,
    severity: IncidentSeverity.HIGH,
    reportedAt: new Date(Date.now() - 1.8 * 60 * 60 * 1000),
    assignee: 'Lê Nguyễn Hoài Nam',
    description: 'Hệ thống chat AI trả về kết quả trung bình mất trên 4 giây (so với 1.2 giây bình thường). Đang kiểm tra log của microservice ZenTech-AI.'
  },
  {
    id: 'INC-003',
    title: 'Bộ nhớ RAM hệ thống quá tải (87%)',
    status: IncidentStatus.RESOLVED,
    severity: IncidentSeverity.MEDIUM,
    reportedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    resolvedAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
    assignee: 'Nguyễn Văn Hùng',
    description: 'Hệ thống chạy ngầm rò rỉ bộ nhớ nhẹ. Đã tiến hành khởi động lại tiến trình Node/Java và thực hiện giải phóng cache Redis.'
  }
];

const mockTickets: SupportTicket[] = [
  {
    id: 'TCK-1024',
    subject: 'Đơn hàng #12304 chưa chuyển trạng thái',
    customerName: 'Nguyễn Thị Mai',
    priority: TicketPriority.HIGH,
    status: TicketStatus.OPEN,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    messages: [
      {
        id: 'MSG-001',
        sender: TicketMessageSender.CUSTOMER,
        content: 'Chào shop, mình thanh toán chuyển khoản đơn hàng #12304 từ sáng rồi mà đơn hàng vẫn ở trạng thái Chờ xử lý. Shop kiểm tra và xác nhận giúp mình với ạ.',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000)
      }
    ]
  },
  {
    id: 'TCK-1025',
    subject: 'Lỗi áp dụng mã voucher giảm giá ZENTECH50',
    customerName: 'Phan Thanh Tùng',
    priority: TicketPriority.MEDIUM,
    status: TicketStatus.IN_PROGRESS,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    messages: [
      {
        id: 'MSG-002',
        sender: TicketMessageSender.CUSTOMER,
        content: 'Mình nhập mã giảm giá ZENTECH50 mà hệ thống báo không tồn tại mặc dù banner bảo còn hạn. Mong shop xem xét lỗi.',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      {
        id: 'MSG-003',
        sender: TicketMessageSender.SUPPORT_AGENT,
        content: 'Chào bạn Tùng, mã giảm giá ZENTECH50 chỉ áp dụng cho đơn hàng từ 500.000đ trở lên ạ. Bạn vui lòng kiểm tra lại giá trị giỏ hàng xem đã đạt yêu cầu chưa nhé.',
        timestamp: new Date(Date.now() - 5.5 * 60 * 1000)
      }
    ]
  },
  {
    id: 'TCK-1026',
    subject: 'Yêu cầu đổi trả bàn phím cơ bị liệt phím Spacebar',
    customerName: 'Vũ Hoàng Long',
    priority: TicketPriority.CRITICAL,
    status: TicketStatus.RESOLVED,
    createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000),
    messages: [
      {
        id: 'MSG-004',
        sender: TicketMessageSender.CUSTOMER,
        content: 'Bàn phím cơ Dareu EK87 mình nhận ngày hôm qua bị liệt phím Spacebar không gõ được. Shop cho mình đổi cái mới.',
        timestamp: new Date(Date.now() - 28 * 60 * 60 * 1000)
      },
      {
        id: 'MSG-005',
        sender: TicketMessageSender.SUPPORT_AGENT,
        content: 'Dạ shop rất xin lỗi về trải nghiệm này của anh ạ. Shop đã tạo đơn đổi mới sản phẩm, shipper sẽ giao hàng mới đến tận nơi và thu hồi lại sản phẩm lỗi hoàn toàn miễn phí trong vòng 1-2 ngày tới nhé.',
        timestamp: new Date(Date.now() - 27.5 * 60 * 60 * 1000)
      },
      {
        id: 'MSG-006',
        sender: TicketMessageSender.CUSTOMER,
        content: 'Cảm ơn shop nhiều nha, xử lý quá chuyên nghiệp và nhanh chóng.',
        timestamp: new Date(Date.now() - 27 * 60 * 60 * 1000)
      }
    ]
  }
];

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
  incidents: mockIncidents,
  tickets: mockTickets,
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
  activityActionsList: []
};

export const AdminStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ logs, issueLogs, logFilter, logSearch, incidents, incidentFilter, tickets, ticketFilter, accounts, accountSearch, activityLogs, activitySearch }) => ({
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

      if (filterVal !== 'ALL') {
        result = result.filter(inc => inc.status === filterVal);
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

      if (filterVal !== 'ALL') {
        result = result.filter(tck => tck.status === filterVal);
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
    adminLogsService = inject(AdminLogsService)
  ) => {
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

      setTicketFilter(filter: TicketStatus | 'ALL') {
        patchState(store, { ticketFilter: filter });
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

      updateIncident(id: string, status: IncidentStatus, severity: IncidentSeverity) {
        patchState(store, (state) => {
          const updatedIncidents = state.incidents.map(inc => {
            if (inc.id === id) {
              const resolvedAt = status === IncidentStatus.RESOLVED ? new Date() : undefined;
              return { ...inc, status, severity, resolvedAt };
            }
            return inc;
          });
          return { incidents: updatedIncidents };
        });

        logActivity(`Cập nhật sự cố ${id}`, `Trạng thái: ${status}, Mức độ: ${severity}`);
        toastService.success(`Đã cập nhật sự cố ${id} thành công`);
      },

      addTicketMessage(ticketId: string, content: string) {
        patchState(store, (state) => {
          const updatedTickets = state.tickets.map(tck => {
            if (tck.id === ticketId) {
              const newMessage: TicketMessage = {
                id: `MSG-${Math.floor(1000 + Math.random() * 9000)}`,
                sender: TicketMessageSender.SUPPORT_AGENT,
                content,
                timestamp: new Date()
              };
              return {
                ...tck,
                status: tck.status === TicketStatus.OPEN ? TicketStatus.IN_PROGRESS : tck.status,
                messages: [...tck.messages, newMessage]
              };
            }
            return tck;
          });
          return { tickets: updatedTickets };
        });

        logActivity(`Phản hồi Ticket ${ticketId}`, `Nội dung: ${content.substring(0, 30)}...`);
      },

      updateTicketStatus(ticketId: string, status: TicketStatus) {
        patchState(store, (state) => {
          const updatedTickets = state.tickets.map(tck => {
            if (tck.id === ticketId) {
              return { ...tck, status };
            }
            return tck;
          });
          return { tickets: updatedTickets };
        });

        logActivity(`Cập nhật Ticket ${ticketId}`, `Trạng thái mới: ${status}`);
        toastService.success(`Đã chuyển trạng thái Ticket thành ${status}`);
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
      }
    };
  })
);
