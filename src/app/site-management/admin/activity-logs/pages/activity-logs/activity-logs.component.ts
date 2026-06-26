import { Component, ChangeDetectionStrategy, NgZone, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideChevronLeft, LucideChevronRight, LucidePointer, LucideSearch, LucideX } from '@lucide/angular';
import { Subscription } from 'rxjs';
import { AdminStore } from '../../../data-access/store/admin.store';
import { ActivityArea, ActivityLog, ActivitySeverity } from '../../../data-access/models/admin.models';
import { AdminLogsService } from '../../../data-access/services/admin-logs.service';
import { WebsocketService } from '../../../../../core/services/websocket.service';
import { AccountService } from '../../../accounts/data-access/services/account.service';
import {
  AccountSortField,
  AccountSummary,
  SortDirection
} from '../../../accounts/data-access/models/account.model';

type ActivityFilter = 'ALL' | string;
type ActivityViewMode = 'TABLE' | 'TIMELINE';
type ActivityTimeRange = 'ALL' | 'TODAY' | '7D' | '30D' | 'CUSTOM';

interface TimelineGroup {
  label: string;
  logs: ActivityLog[];
}

interface ChangeRow {
  field: string;
  before: string;
  after: string;
}

interface CursorStyle {
  left: string;
  top: string;
}

interface BrowserInfo {
  browser: string;
  browserIcon: string;
  browserIconClass: string;
  os: string;
  osIcon: string;
  osIconClass: string;
  device: string;
  deviceIcon: string;
  deviceIconClass: string;
  engine: string;
  raw: string;
}

@Component({
  selector: 'app-admin-activity-logs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideSearch,
    LucideChevronLeft,
    LucideChevronRight,
    LucidePointer,
    LucideX
  ],
  templateUrl: './activity-logs.component.html',
  styleUrl: './activity-logs.component.css'
})
export class ActivityLogsComponent implements OnInit, OnDestroy {
  protected readonly store = inject(AdminStore);
  private readonly adminLogsService = inject(AdminLogsService);
  private readonly accountService = inject(AccountService);
  private readonly wsService = inject(WebsocketService);
  private readonly ngZone = inject(NgZone);
  protected readonly viewMode = signal<ActivityViewMode>('TABLE');
  protected readonly searchText = signal('');
  protected readonly selectedLog = signal<ActivityLog | null>(null);
  protected readonly pendingRealtimeCount = signal(0);
  protected readonly timelineLogs = signal<ActivityLog[]>([]);
  protected readonly isLoadingTimeline = signal(false);
  protected readonly timelineEmail = signal('');
  protected readonly timelineTimeRange = signal<ActivityTimeRange>('7D');
  protected readonly timelineFrom = signal('');
  protected readonly timelineTo = signal('');
  protected readonly timelineSeverity = signal('ALL');
  protected readonly timelineModule = signal('ALL');
  protected readonly timelineAction = signal('ALL');
  protected readonly timelinePage = signal(0);
  protected readonly timelineSize = signal(50);
  protected readonly totalTimelineLogs = signal(0);
  protected readonly replayIndex = signal(0);
  protected readonly isReplayPlaying = signal(false);
  protected readonly replaySpeed = signal(1);
  protected readonly behaviorSummary = signal<string[]>([]);
  protected readonly isGeneratingBehaviorSummary = signal(false);
  protected readonly behaviorSummaryFallback = signal(false);
  protected readonly timelineAccountOptions = signal<AccountSummary[]>([]);
  protected readonly isLoadingTimelineAccounts = signal(false);
  protected readonly isTimelineUserPickerOpen = signal(false);

  protected readonly areaOptions = Object.values(ActivityArea);
  protected readonly severityOptions = Object.values(ActivitySeverity);
  protected readonly timeRangeOptions: Array<{ value: ActivityTimeRange; label: string }> = [
    { value: 'TODAY', label: 'Hôm nay' },
    { value: '7D', label: '7 ngày gần nhất' },
    { value: '30D', label: '30 ngày gần nhất' },
    { value: 'CUSTOM', label: 'Tùy chọn' },
    { value: 'ALL', label: 'Tất cả thời gian' }
  ];

  protected readonly moduleOptions = computed(() => {
    return this.store.activityModulesList();
  });

  protected readonly actionOptions = computed(() => {
    return this.store.activityActionsList();
  });

  protected readonly displayedActivityLogs = computed(() => {
    return this.store.filteredActivityLogs();
  });

  protected readonly timelineGroups = computed<TimelineGroup[]>(() => {
    const groups = new Map<string, ActivityLog[]>();
    for (const log of this.timelineLogs()) {
      const key = this.formatDateKey(log.timestamp);
      const current = groups.get(key) ?? [];
      current.push(log);
      groups.set(key, current);
    }
    return Array.from(groups.entries()).map(([label, logs]) => ({ label, logs }));
  });

  protected readonly timelineStats = computed(() => {
    const logs = this.timelineLogs();
    const securityCount = logs.filter(log => ['SECURITY', 'CRITICAL'].includes(log.severity || '')).length;
    const importantCount = logs.filter(log => ['IMPORTANT', 'CRITICAL'].includes(log.severity || '')).length;
    const uniqueIps = new Set(logs.map(log => log.ipAddress).filter(Boolean)).size;
    const latest = logs.length > 0 ? logs[logs.length - 1].timestamp : null;
    return {
      total: this.totalTimelineLogs() || logs.length,
      securityCount,
      importantCount,
      uniqueIps,
      latest
    };
  });

  protected readonly replayLog = computed(() => {
    return this.timelineLogs()[this.replayIndex()] ?? null;
  });

  protected readonly replayProgress = computed(() => {
    const total = this.timelineLogs().length;
    if (total <= 1) return total === 1 ? 100 : 0;
    return Math.round((this.replayIndex() / (total - 1)) * 100);
  });

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private accountSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private replayTimer: ReturnType<typeof setInterval> | null = null;
  private wsSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.searchText.set(this.store.activitySearch());
    this.store.loadActivityLogMetadata();
    this.store.loadActivityLogs({
      page: this.store.activityPage(),
      size: this.store.activitySize(),
      search: this.store.activitySearch(),
      area: this.store.activityArea(),
      severity: this.store.activitySeverity(),
      module: this.store.activityModule(),
      action: this.store.activityAction(),
      ...this.activityDateParams()
    });
    this.startRealtimeActivityLogs();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    if (this.accountSearchTimer) {
      clearTimeout(this.accountSearchTimer);
    }
    this.stopReplay();
    this.stopRealtimeActivityLogs();
  }

  protected handleSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.store.setActivitySearch(value);
    }, 350);
  }

  protected changeAreaFilter(value: string): void {
    this.store.setActivityArea(value);
    this.pendingRealtimeCount.set(0);
  }

  protected changeSeverityFilter(value: string): void {
    this.store.setActivitySeverity(value);
    this.pendingRealtimeCount.set(0);
  }

  protected changeActionFilter(value: string): void {
    this.store.setActivityAction(value);
    this.pendingRealtimeCount.set(0);
  }

  protected changeModuleFilter(value: string): void {
    this.store.setActivityModule(value);
    this.pendingRealtimeCount.set(0);
  }

  protected changeTimeRangeFilter(value: ActivityTimeRange): void {
    this.store.setActivityTimeRange(value);
    this.pendingRealtimeCount.set(0);
  }

  protected changeCustomFrom(event: Event): void {
    this.store.setActivityCustomDateRange((event.target as HTMLInputElement).value, this.store.activityTo());
    this.pendingRealtimeCount.set(0);
  }

  protected changeCustomTo(event: Event): void {
    this.store.setActivityCustomDateRange(this.store.activityFrom(), (event.target as HTMLInputElement).value);
    this.pendingRealtimeCount.set(0);
  }

  protected changePage(page: number): void {
    const maxPage = this.totalPages;
    if (page >= 0 && page < maxPage) {
      this.store.setActivityPage(page);
      this.pendingRealtimeCount.set(0);
    }
  }

  protected changeSize(event: Event): void {
    const size = parseInt((event.target as HTMLSelectElement).value, 10);
    this.store.setActivitySize(size);
    this.pendingRealtimeCount.set(0);
  }

  protected refreshRealtimeLogs(): void {
    this.pendingRealtimeCount.set(0);
    this.store.loadActivityLogs({
      page: this.store.activityPage(),
      size: this.store.activitySize(),
      search: this.store.activitySearch(),
      area: this.store.activityArea(),
      severity: this.store.activitySeverity(),
      module: this.store.activityModule(),
      action: this.store.activityAction(),
      ...this.activityDateParams()
    });
  }

  private activityDateParams(): { from: string; to: string } {
    const range = this.store.activityTimeRange() as ActivityTimeRange;

    if (range === 'ALL') {
      return { from: '', to: '' };
    }

    if (range === 'CUSTOM') {
      return {
        from: this.store.activityFrom() ? this.startOfLocalDayIso(this.store.activityFrom()) : '',
        to: this.store.activityTo() ? this.endOfLocalDayIso(this.store.activityTo()) : ''
      };
    }

    const today = new Date();
    const fromDate = new Date(today);
    if (range === 'TODAY') {
      const todayInput = this.formatDateInput(today);
      return {
        from: this.startOfLocalDayIso(todayInput),
        to: this.endOfLocalDayIso(todayInput)
      };
    }

    fromDate.setDate(today.getDate() - (range === '30D' ? 29 : 6));
    return {
      from: this.startOfLocalDayIso(this.formatDateInput(fromDate)),
      to: this.endOfLocalDayIso(this.formatDateInput(today))
    };
  }

  private formatDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private startOfLocalDayIso(value: string): string {
    return new Date(`${value}T00:00:00`).toISOString();
  }

  private endOfLocalDayIso(value: string): string {
    return new Date(`${value}T23:59:59.999`).toISOString();
  }

  protected switchView(mode: ActivityViewMode): void {
    this.viewMode.set(mode);
    if (mode === 'TIMELINE') {
      this.loadTimelineAccounts();
    }
  }

  protected openTimelineForLog(log: ActivityLog, event?: Event): void {
    event?.stopPropagation();
    this.timelineEmail.set(log.operatorEmail || '');
    this.isTimelineUserPickerOpen.set(false);
    this.timelinePage.set(0);
    this.viewMode.set('TIMELINE');
    this.loadTimelineAccounts(log.operatorEmail || '');
    this.loadTimeline();
  }

  protected handleTimelineEmailInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.timelineEmail.set(value);
    this.isTimelineUserPickerOpen.set(true);
    if (this.accountSearchTimer) {
      clearTimeout(this.accountSearchTimer);
    }
    this.accountSearchTimer = setTimeout(() => {
      this.loadTimelineAccounts(value);
    }, 250);
  }

  protected openTimelineUserPicker(): void {
    this.isTimelineUserPickerOpen.set(true);
    if (this.timelineAccountOptions().length === 0) {
      this.loadTimelineAccounts(this.timelineEmail());
    }
  }

  protected closeTimelineUserPickerSoon(): void {
    setTimeout(() => this.isTimelineUserPickerOpen.set(false), 160);
  }

  protected selectTimelineAccount(account: AccountSummary): void {
    this.timelineEmail.set(account.email);
    this.isTimelineUserPickerOpen.set(false);
    this.timelinePage.set(0);
    this.loadTimeline();
  }

  protected accountInitials(account: AccountSummary): string {
    return this.getInitials(account.displayName || account.email);
  }

  protected changeTimelineFrom(event: Event): void {
    this.timelineFrom.set((event.target as HTMLInputElement).value);
    this.timelinePage.set(0);
    this.loadTimeline();
  }

  protected changeTimelineTo(event: Event): void {
    this.timelineTo.set((event.target as HTMLInputElement).value);
    this.timelinePage.set(0);
    this.loadTimeline();
  }

  protected changeTimelineTimeRange(value: ActivityTimeRange): void {
    this.timelineTimeRange.set(value);
    this.timelinePage.set(0);
    this.loadTimeline();
  }

  protected changeTimelineSeverity(value: string): void {
    this.timelineSeverity.set(value);
    this.timelinePage.set(0);
    this.loadTimeline();
  }

  protected changeTimelineModule(value: string): void {
    this.timelineModule.set(value);
    this.timelinePage.set(0);
    this.loadTimeline();
  }

  protected changeTimelineAction(value: string): void {
    this.timelineAction.set(value);
    this.timelinePage.set(0);
    this.loadTimeline();
  }

  protected applyTimelineFilters(): void {
    this.timelinePage.set(0);
    this.loadTimeline();
  }

  protected resetTimelineFilters(): void {
    this.timelineEmail.set('');
    this.timelineTimeRange.set('7D');
    this.timelineFrom.set('');
    this.timelineTo.set('');
    this.timelineSeverity.set('ALL');
    this.timelineModule.set('ALL');
    this.timelineAction.set('ALL');
    this.timelinePage.set(0);
    this.clearTimeline();
    this.loadTimelineAccounts();
  }

  protected showTimelineAllTime(): void {
    if (!this.timelineEmail().trim()) {
      return;
    }
    this.timelineTimeRange.set('ALL');
    this.timelineFrom.set('');
    this.timelineTo.set('');
    this.timelinePage.set(0);
    this.loadTimeline();
  }

  protected timelineEmptyTitle(): string {
    return this.timelineEmail().trim()
      ? 'Chưa có nhật ký trong bộ lọc hiện tại'
      : 'Chọn user để bắt đầu timeline';
  }

  protected timelineEmptyDescription(): string {
    return this.timelineEmail().trim()
      ? 'User này chưa có hoạt động phù hợp với thời gian, mức độ, module hoặc hành động đang lọc.'
      : 'Chọn một user trong danh sách hoặc click user từ Bảng nhật ký để xem chuỗi hành vi.';
  }

  protected changeTimelinePage(page: number): void {
    if (page >= 0 && page < this.totalTimelinePages) {
      this.timelinePage.set(page);
      this.loadTimeline();
    }
  }

  protected toggleReplay(): void {
    if (this.isReplayPlaying()) {
      this.stopReplay();
      return;
    }
    this.startReplay();
  }

  protected setReplaySpeed(speed: number): void {
    this.replaySpeed.set(speed);
    if (this.isReplayPlaying()) {
      this.startReplay();
    }
  }

  protected seekReplay(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.replayIndex.set(Math.max(0, Math.min(value, this.timelineLogs().length - 1)));
  }

  protected seekReplayTo(index: number): void {
    this.replayIndex.set(Math.max(0, Math.min(index, this.timelineLogs().length - 1)));
  }

  protected jumpReplay(step: number): void {
    const nextIndex = this.replayIndex() + step;
    this.replayIndex.set(Math.max(0, Math.min(nextIndex, this.timelineLogs().length - 1)));
  }

  protected resetReplay(): void {
    this.stopReplay();
    this.replayIndex.set(0);
  }

  protected generateBehaviorSummary(): void {
    const logs = this.timelineLogs();
    if (logs.length === 0) {
      this.behaviorSummary.set(['Chưa có dữ liệu timeline để tóm tắt.']);
      this.behaviorSummaryFallback.set(true);
      return;
    }

    const dateParams = this.timelineDateParams();
    this.isGeneratingBehaviorSummary.set(true);
    this.behaviorSummaryFallback.set(false);
    this.adminLogsService.summarizeActivityTimeline({
      email: this.timelineEmail().trim(),
      from: dateParams.from || undefined,
      to: dateParams.to || undefined,
      severity: this.filterValue(this.timelineSeverity()),
      module: this.filterValue(this.timelineModule()),
      action: this.filterValue(this.timelineAction()),
      size: this.timelineSize()
    }).subscribe({
      next: (response) => {
        const summary = response.data;
        this.behaviorSummary.set(summary.lines?.length ? summary.lines : this.buildLocalBehaviorSummary(logs));
        this.behaviorSummaryFallback.set(!!summary.fallback);
        this.isGeneratingBehaviorSummary.set(false);
      },
      error: (err) => {
        console.error('[Activity Timeline Summary Error]', err);
        this.behaviorSummary.set(this.buildLocalBehaviorSummary(logs));
        this.behaviorSummaryFallback.set(true);
        this.isGeneratingBehaviorSummary.set(false);
      }
    });
  }

  private buildLocalBehaviorSummary(logs: ActivityLog[]): string[] {
    const first = logs[0];
    const last = logs[logs.length - 1];
    const modules = this.topValues(logs.map(log => log.module || 'N/A'), 3);
    const actions = this.topValues(logs.map(log => this.actionLabel(log)), 3);
    const importantLogs = logs.filter(log => ['IMPORTANT', 'SECURITY', 'CRITICAL'].includes(log.severity || ''));
    const traceCount = logs.filter(log => !!log.traceId).length;
    const changedCount = logs.filter(log => this.diffRows(log).length > 0).length;
    const uniqueIps = new Set(logs.map(log => log.ipAddress).filter(Boolean));
    const userLabel = first.operatorEmail || first.operatorFullName || this.timelineEmail() || 'user này';

    return [
      `${userLabel} có ${logs.length} hành động trong hành trình hiện tại, bắt đầu lúc ${this.formatReplayTime(first.timestamp)} và kết thúc lúc ${this.formatReplayTime(last.timestamp)}.`,
      `Module nổi bật: ${modules || 'chưa rõ'}; hành động lặp lại nhiều: ${actions || 'chưa rõ'}.`,
      `Có ${importantLogs.length} hành động cần chú ý theo mức độ audit, ${uniqueIps.size} IP khác nhau và ${traceCount} trace có thể đối chiếu với system logs.`,
      changedCount > 0
        ? `Phát hiện ${changedCount} bước có dữ liệu thay đổi trước/sau, nên mở So sánh thay đổi để kiểm tra bằng chứng.`
        : 'Chưa thấy metadata before/after đủ rõ để dựng diff thay đổi.'
    ];
  }

  protected openTimelineDetail(log: ActivityLog): void {
    const index = this.timelineLogs().findIndex(item => item.id === log.id);
    if (index >= 0) {
      this.replayIndex.set(index);
    }
    this.openDetail(log);
  }

  protected openDetail(log: ActivityLog): void {
    this.selectedLog.set(log);
  }

  protected closeDetail(): void {
    this.selectedLog.set(null);
  }

  protected getInitials(fullName: string): string {
    if (!fullName) return 'AN';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  protected areaLabel(area?: string): string {
    const labels: Record<string, string> = {
      CUSTOMER: 'Mua hàng',
      MANAGEMENT: 'Nội bộ',
      ADMIN: 'Admin',
      SYSTEM: 'Hệ thống'
    };
    return labels[area || ''] || 'Khác';
  }

  protected severityLabel(severity?: string): string {
    const labels: Record<string, string> = {
      INFO: 'Thông tin',
      IMPORTANT: 'Quan trọng',
      SECURITY: 'Bảo mật',
      CRITICAL: 'Nghiêm trọng'
    };
    return labels[severity || ''] || 'Thông tin';
  }

  protected roleLabel(role?: string): string {
    const labels: Record<string, string> = {
      ADMIN: 'Admin',
      OWNER: 'Owner',
      MANAGER: 'Manager',
      EMPLOYEE: 'Employee',
      CUSTOMER: 'Customer'
    };
    return labels[role || ''] || 'N/A';
  }

  protected actionLabel(log: ActivityLog): string {
    return this.actionNameLabel(log.action, log.actionLabel);
  }

  protected actionNameLabel(action: string, fallback?: string): string {
    const labels: Record<string, string> = {
      LOGIN: 'Đăng nhập',
      LOGIN_FAILED: 'Đăng nhập thất bại',
      LOGOUT: 'Đăng xuất',
      PASSWORD_CHANGED: 'Đổi mật khẩu',
      PASSWORD_RESET_REQUESTED: 'Yêu cầu đặt lại mật khẩu',
      PASSWORD_RESET_COMPLETED: 'Đặt lại mật khẩu',
      ACCESS_DENIED: 'Từ chối truy cập',
      CREATE_ACCOUNT: 'Tạo tài khoản',
      UPDATE_ACCOUNT: 'Cập nhật tài khoản',
      DELETE_ACCOUNT: 'Xóa tài khoản',
      LOCK_ACCOUNT: 'Khóa tài khoản',
      UNLOCK_ACCOUNT: 'Mở khóa tài khoản',
      CHANGE_ROLE: 'Đổi vai trò',
      CHANGE_PERMISSION: 'Đổi phân quyền',
      CHECKOUT_STARTED: 'Bắt đầu đặt hàng',
      CHECKOUT_COMPLETED: 'Đặt hàng thành công',
      CHECKOUT_FAILED: 'Đặt hàng thất bại',
      PAYMENT_STARTED: 'Bắt đầu thanh toán',
      PAYMENT_COMPLETED: 'Thanh toán thành công',
      PAYMENT_FAILED: 'Thanh toán thất bại',
      ORDER_CANCELLED_BY_CUSTOMER: 'Khách hủy đơn hàng',
      REVIEW_CREATED: 'Tạo đánh giá',
      REVIEW_UPDATED: 'Cập nhật đánh giá',
      REVIEW_DELETED: 'Xóa đánh giá',
      CREATE_PRODUCT: 'Tạo sản phẩm',
      UPDATE_PRODUCT: 'Cập nhật sản phẩm',
      DELETE_PRODUCT: 'Xóa sản phẩm',
      UPDATE_PRODUCT_STATUS: 'Cập nhật trạng thái sản phẩm',
      UPDATE_PRICE: 'Cập nhật giá',
      UPDATE_STOCK: 'Cập nhật tồn kho',
      IMPORT_STOCK: 'Nhập kho',
      EXPORT_STOCK: 'Xuất kho',
      UPDATE_ORDER_STATUS: 'Cập nhật đơn hàng',
      CANCEL_ORDER: 'Hủy đơn hàng',
      ASSIGN_ORDER: 'Phân công đơn hàng',
      CREATE_COUPON: 'Tạo mã giảm giá',
      UPDATE_COUPON: 'Cập nhật mã giảm giá',
      DELETE_COUPON: 'Xóa mã giảm giá',
      ISSUE_VOUCHER: 'Phát voucher',
      REVOKE_VOUCHER: 'Thu hồi voucher',
      CREATE_EMPLOYEE: 'Tạo nhân viên',
      UPDATE_EMPLOYEE: 'Cập nhật nhân viên',
      DELETE_EMPLOYEE: 'Xóa nhân viên',
      UPDATE_SHIFT: 'Cập nhật ca làm',
      CHECK_IN: 'Chấm công vào',
      CHECK_OUT: 'Chấm công ra',
      CREATE_TICKET: 'Tạo ticket',
      UPDATE_TICKET_STATUS: 'Cập nhật trạng thái ticket',
      ASSIGN_TICKET: 'Gán ticket',
      REPLY_TICKET: 'Phản hồi ticket',
      CLOSE_TICKET: 'Đóng ticket',
      STAFF_JOIN_CHAT: 'Nhân viên vào chat',
      STAFF_LEAVE_CHAT: 'Nhân viên rời chat',
      VIEW_LOG_DETAIL: 'Xem chi tiết log',
      EXPORT_LOG: 'Xuất log',
      CLEAR_LOG: 'Xóa log hiển thị',
      ARCHIVE_LOG: 'Lưu trữ log',
      CREATE_INCIDENT: 'Tạo sự cố',
      UPDATE_INCIDENT: 'Cập nhật sự cố',
      RESOLVE_INCIDENT: 'Xử lý sự cố',
      CREATE_PRODUCT_GROUP: 'Tạo nhóm sản phẩm',
      UPDATE_PRODUCT_GROUP: 'Cập nhật nhóm sản phẩm',
      DELETE_PRODUCT_GROUP: 'Xóa nhóm sản phẩm',
      CREATE_AI_AGENT: 'Tạo AI agent',
      UPDATE_AI_AGENT: 'Cập nhật AI agent',
      DELETE_AI_AGENT: 'Xóa AI agent',
      CHANGE_AI_AGENT_ROLE: 'Thay đổi vai trò AI agent',
      CREATE_AI_DATASET: 'Tạo bộ dữ liệu AI',
      UPDATE_AI_DATASET: 'Cập nhật bộ dữ liệu AI',
      DELETE_AI_DATASET: 'Xóa bộ dữ liệu AI',
      UPLOAD_AI_DOCUMENT: 'Tải lên tài liệu AI',
      DELETE_AI_DOCUMENT: 'Xóa tài liệu AI',
      UPDATE_SYSTEM_SETTING: 'Cập nhật cấu hình hệ thống'
    };
    return labels[action] || fallback || this.toTitleCase(action);
  }
  protected targetLabel(log: ActivityLog): string {
    if ((log.action === 'LOGIN' || log.action === 'LOGOUT' || log.action === 'LOGIN_FAILED') && log.operatorEmail) {
      return log.targetLabel && log.targetLabel !== 'ACCOUNT' ? log.targetLabel : log.operatorEmail;
    }
    return log.targetLabel || log.target || log.targetId || log.targetType || 'N/A';
  }

  protected summary(log: ActivityLog): string {
    return this.formatSentence(this.translateSummary(log.summary || log.target || 'Không có tóm tắt'));
  }

  protected prettyMetadata(metadata?: string): string {
    if (!metadata) {
      return 'N/A';
    }
    try {
      return JSON.stringify(JSON.parse(metadata), null, 2);
    } catch {
      return metadata;
    }
  }

  protected riskLabel(log: ActivityLog): string {
    if (log.action === 'LOGIN_FAILED') return 'Đăng nhập thất bại';
    if (['LOCK_ACCOUNT', 'UNLOCK_ACCOUNT', 'CHANGE_ROLE', 'CHANGE_PERMISSION'].includes(log.action)) {
      return 'Tác động tài khoản';
    }
    if (['SECURITY', 'CRITICAL'].includes(log.severity || '')) return 'Cần chú ý';
    if (['IMPORTANT'].includes(log.severity || '')) return 'Quan trọng';
    return 'Bình thường';
  }

  protected isRiskyTimelineItem(log: ActivityLog): boolean {
    return ['LOGIN_FAILED', 'LOCK_ACCOUNT', 'UNLOCK_ACCOUNT', 'CHANGE_ROLE', 'CHANGE_PERMISSION'].includes(log.action)
      || ['SECURITY', 'CRITICAL'].includes(log.severity || '');
  }

  protected traceLogLink(log: ActivityLog): string {
    return log.traceId ? `/admin/logs?traceId=${encodeURIComponent(log.traceId)}` : '/admin/logs';
  }

  protected diffRows(log: ActivityLog): ChangeRow[] {
    if (!log.metadata) return [];
    const parsed = this.parseMetadataObject(log.metadata);
    if (!parsed) return [];
    return this.extractChangeRows(parsed).slice(0, 12);
  }

  protected diffFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      stockQuantity: 'Số lượng tồn kho',
      quantity: 'Số lượng',
      status: 'Trạng thái',
      price: 'Giá',
      name: 'Tên',
      productName: 'Tên sản phẩm',
      variantName: 'Tên biến thể',
      productVariantId: 'Mã biến thể',
      note: 'Ghi chú',
      reason: 'Lý do',
      role: 'Vai trò',
      active: 'Trạng thái tài khoản'
    };
    return labels[field] || this.toReadableFieldName(field);
  }

  protected formatReplayTime(value?: Date): string {
    if (!value) return 'N/A';
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit'
    }).format(value);
  }

  protected replaySceneClass(log: ActivityLog): string {
    const key = `${log.module || ''} ${log.targetType || ''} ${log.action || ''}`.toUpperCase();
    if (key.includes('AUTH') || key.includes('LOGIN') || key.includes('PASSWORD')) return 'replay-scene--auth';
    if (key.includes('ACCOUNT') || key.includes('ROLE') || key.includes('PERMISSION')) return 'replay-scene--account';
    if (key.includes('INVENTORY') || key.includes('STOCK')) return 'replay-scene--inventory';
    if (key.includes('ORDER') || key.includes('CHECKOUT') || key.includes('PAYMENT')) return 'replay-scene--order';
    if (key.includes('PRODUCT') || key.includes('COUPON') || key.includes('VOUCHER')) return 'replay-scene--catalog';
    if (key.includes('AI')) return 'replay-scene--ai';
    return 'replay-scene--system';
  }

  protected replaySceneTitle(log: ActivityLog): string {
    const module = (log.module || '').toUpperCase();
    const action = log.action.toUpperCase();
    if (module.includes('AUTH') || action.includes('LOGIN')) return 'Cổng xác thực';
    if (module.includes('ACCOUNT')) return 'Quản lý tài khoản';
    if (module.includes('INVENTORY')) return 'Điều phối tồn kho';
    if (module.includes('ORDER') || module.includes('CHECKOUT')) return 'Vận hành đơn hàng';
    if (module.includes('PRODUCT')) return 'Danh mục sản phẩm';
    if (module.includes('MARKETING')) return 'Marketing & voucher';
    if (module.includes('AI')) return 'AI Management';
    return `${log.module || log.targetType || 'Hệ thống'}`;
  }

  protected replaySceneSubtitle(log: ActivityLog): string {
    const browser = this.browserInfo(log.userAgent);
    return `${log.operatorEmail || 'anonymous'} • ${log.ipAddress || 'unknown'} • ${browser.browser}`;
  }

  protected replayRoute(log: ActivityLog): string {
    const module = (log.module || log.targetType || 'system').toLowerCase();
    const normalized = module
      .replace(/_/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '');
    return `/admin/${normalized || 'system'}`;
  }

  protected replayCursorStyle(index: number): CursorStyle {
    const positions = [
      { left: '18%', top: '28%' },
      { left: '58%', top: '34%' },
      { left: '76%', top: '62%' },
      { left: '38%', top: '70%' },
      { left: '48%', top: '46%' },
      { left: '84%', top: '24%' }
    ];
    return positions[index % positions.length];
  }

  protected replayMiniMetric(log: ActivityLog, slot: number): string {
    if (slot === 0) return this.severityLabel(log.severity);
    if (slot === 1) return log.module || 'SYSTEM';
    return log.traceId || log.targetType || 'LIVE';
  }

  protected browserInfo(userAgent?: string): BrowserInfo {
    const raw = userAgent?.trim() || 'N/A';
    if (!userAgent || userAgent === 'unknown') {
      return {
        browser: 'Không xác định',
        browserIcon: '?',
        browserIconClass: 'brand-icon--unknown',
        os: 'Không xác định',
        osIcon: '?',
        osIconClass: 'brand-icon--unknown',
        device: 'Không xác định',
        deviceIcon: '?',
        deviceIconClass: 'brand-icon--unknown',
        engine: 'Không xác định',
        raw
      };
    }

    const browser = this.detectBrowser(userAgent);
    const os = this.detectOperatingSystem(userAgent);
    const device = this.detectDevice(userAgent);

    return {
      browser,
      browserIcon: this.browserIconText(browser),
      browserIconClass: this.browserIconClass(browser),
      os,
      osIcon: this.osIconText(os),
      osIconClass: this.osIconClass(os),
      device,
      deviceIcon: this.deviceIconText(device),
      deviceIconClass: this.deviceIconClass(device),
      engine: this.detectEngine(userAgent),
      raw
    };
  }

  protected get totalPages(): number {
    const total = this.store.totalActivityLogs();
    const size = this.store.activitySize();
    return total > 0 ? Math.ceil(total / size) : 1;
  }

  protected get totalTimelinePages(): number {
    const total = this.totalTimelineLogs();
    const size = this.timelineSize();
    return total > 0 ? Math.ceil(total / size) : 1;
  }

  protected get startRecordIndex(): number {
    const total = this.store.totalActivityLogs();
    if (total === 0) return 0;
    return this.store.activityPage() * this.store.activitySize() + 1;
  }

  protected get endRecordIndex(): number {
    const end = (this.store.activityPage() + 1) * this.store.activitySize();
    const total = this.store.totalActivityLogs();
    return end > total ? total : end;
  }

  private matchesFilter(filter: ActivityFilter, value?: string): boolean {
    return filter === 'ALL' || value === filter;
  }

  private filterValue(value?: string): string | undefined {
    return value && value !== 'ALL' ? value : undefined;
  }

  private startRealtimeActivityLogs(): void {
    this.stopRealtimeActivityLogs();
    this.wsService.connect();
    this.wsSubscription = this.wsService.subscribe<ActivityLog>('/topic/admin.activity-logs')
      .subscribe({
        next: (logItem) => {
          this.ngZone.run(() => this.handleRealtimeActivityLog(logItem));
        },
        error: (err) => {
          console.error('[Activity Logs WS Subscription Error]', err);
        }
      });
  }

  private stopRealtimeActivityLogs(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
      this.wsSubscription = null;
    }
  }

  private handleRealtimeActivityLog(logItem: ActivityLog): void {
    const normalizedLog: ActivityLog = {
      ...logItem,
      timestamp: new Date(logItem.timestamp)
    };

    if (this.shouldPrependRealtimeLog(normalizedLog)) {
      this.store.prependRealtimeActivityLog(normalizedLog);
      this.pendingRealtimeCount.set(0);
      return;
    }

    this.pendingRealtimeCount.update(count => count + 1);
  }

  private shouldPrependRealtimeLog(log: ActivityLog): boolean {
    return this.store.activityPage() === 0
      && this.matchesSearch(log)
      && this.matchesFilter(this.store.activityArea(), log.area)
      && this.matchesFilter(this.store.activitySeverity(), log.severity)
      && this.matchesFilter(this.store.activityAction(), log.action)
      && this.matchesFilter(this.store.activityModule(), log.module);
  }

  private loadTimeline(): void {
    if (!this.timelineEmail().trim()) {
      this.clearTimeline();
      return;
    }

    const dateParams = this.timelineDateParams();
    this.isLoadingTimeline.set(true);
    this.adminLogsService.getActivityTimeline({
      email: this.timelineEmail().trim(),
      from: dateParams.from,
      to: dateParams.to,
      page: this.timelinePage(),
      size: this.timelineSize(),
      severity: this.timelineSeverity(),
      module: this.timelineModule(),
      action: this.timelineAction()
    }).subscribe({
      next: (response) => {
        const page = response.data;
        this.timelineLogs.set(page.content.map(log => ({
          ...log,
          timestamp: new Date(log.timestamp)
        })));
        this.totalTimelineLogs.set(page.totalElements);
        this.timelinePage.set(page.page);
        this.timelineSize.set(page.size);
        this.replayIndex.set(0);
        this.stopReplay();
        this.behaviorSummary.set([]);
        this.behaviorSummaryFallback.set(false);
        this.isLoadingTimeline.set(false);
      },
      error: (err) => {
        console.error('[Activity Timeline Load Error]', err);
        this.timelineLogs.set([]);
        this.totalTimelineLogs.set(0);
        this.isLoadingTimeline.set(false);
      }
    });
  }

  private clearTimeline(): void {
    this.timelineLogs.set([]);
    this.totalTimelineLogs.set(0);
    this.timelinePage.set(0);
    this.replayIndex.set(0);
    this.stopReplay();
    this.behaviorSummary.set([]);
    this.behaviorSummaryFallback.set(false);
    this.isGeneratingBehaviorSummary.set(false);
    this.isLoadingTimeline.set(false);
  }

  private loadTimelineAccounts(keyword = ''): void {
    this.isLoadingTimelineAccounts.set(true);
    this.accountService.getAccounts({
      page: 0,
      size: 100,
      sortField: AccountSortField.CreatedAt,
      sortDirection: SortDirection.Desc,
      keyword,
      role: null,
      active: null
    }).subscribe({
      next: (response) => {
        this.timelineAccountOptions.set(response.data.content);
        this.isLoadingTimelineAccounts.set(false);
      },
      error: (err) => {
        console.error('[Timeline Account Picker Load Error]', err);
        this.timelineAccountOptions.set([]);
        this.isLoadingTimelineAccounts.set(false);
      }
    });
  }

  private timelineDateParams(): { from: string; to: string } {
    const range = this.timelineTimeRange();

    if (range === 'ALL') {
      return { from: '', to: '' };
    }

    if (range === 'CUSTOM') {
      return {
        from: this.timelineFrom() ? this.startOfLocalDayIso(this.timelineFrom()) : '',
        to: this.timelineTo() ? this.endOfLocalDayIso(this.timelineTo()) : ''
      };
    }

    const today = new Date();
    const fromDate = new Date(today);
    if (range === 'TODAY') {
      const todayInput = this.formatDateInput(today);
      return {
        from: this.startOfLocalDayIso(todayInput),
        to: this.endOfLocalDayIso(todayInput)
      };
    }

    fromDate.setDate(today.getDate() - (range === '30D' ? 29 : 6));
    return {
      from: this.startOfLocalDayIso(this.formatDateInput(fromDate)),
      to: this.endOfLocalDayIso(this.formatDateInput(today))
    };
  }

  private startReplay(): void {
    const logs = this.timelineLogs();
    if (logs.length === 0) return;

    if (this.replayIndex() >= logs.length - 1) {
      this.replayIndex.set(0);
    }
    this.stopReplay(false);
    this.isReplayPlaying.set(true);
    const intervalMs = Math.max(450, 1600 / this.replaySpeed());
    this.replayTimer = setInterval(() => {
      const next = this.replayIndex() + 1;
      if (next >= this.timelineLogs().length) {
        this.stopReplay();
        return;
      }
      this.replayIndex.set(next);
    }, intervalMs);
  }

  private stopReplay(markPaused = true): void {
    if (this.replayTimer) {
      clearInterval(this.replayTimer);
      this.replayTimer = null;
    }
    if (markPaused) {
      this.isReplayPlaying.set(false);
    }
  }

  private parseMetadataObject(metadata: string): unknown | null {
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  }

  private extractChangeRows(value: unknown, prefix = '', depth = 0): ChangeRow[] {
    if (depth > 4 || !value || typeof value !== 'object') return [];
    const objectValue = value as Record<string, unknown>;
    const rows: ChangeRow[] = [];

    rows.push(...this.compareObjectPairs(objectValue, 'before', 'after', prefix));
    rows.push(...this.compareObjectPairs(objectValue, 'old', 'new', prefix));
    rows.push(...this.compareObjectPairs(objectValue, 'previous', 'current', prefix));

    for (const [key, child] of Object.entries(objectValue)) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      if (Array.isArray(child) && key.toLowerCase().includes('change')) {
        for (const item of child) {
          rows.push(...this.extractChangeRows(item, fieldName, depth + 1));
        }
        continue;
      }
      if (!child || typeof child !== 'object') continue;
      const childObject = child as Record<string, unknown>;
      const before = childObject['before'] ?? childObject['old'] ?? childObject['oldValue'] ?? childObject['from'];
      const after = childObject['after'] ?? childObject['new'] ?? childObject['newValue'] ?? childObject['to'];
      if (before !== undefined || after !== undefined) {
        rows.push({
          field: this.cleanFieldName(fieldName),
          before: this.stringifyDiffValue(before),
          after: this.stringifyDiffValue(after)
        });
      } else {
        rows.push(...this.extractChangeRows(child, fieldName, depth + 1));
      }
    }

    return this.uniqueChangeRows(rows);
  }

  private compareObjectPairs(
    objectValue: Record<string, unknown>,
    beforeKey: string,
    afterKey: string,
    prefix: string
  ): ChangeRow[] {
    const before = objectValue[beforeKey];
    const after = objectValue[afterKey];
    if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return [];

    const beforeObject = before as Record<string, unknown>;
    const afterObject = after as Record<string, unknown>;
    const keys = new Set([...Object.keys(beforeObject), ...Object.keys(afterObject)]);
    return Array.from(keys)
      .filter(key => JSON.stringify(beforeObject[key]) !== JSON.stringify(afterObject[key]))
      .map(key => ({
        field: this.cleanFieldName(prefix ? `${prefix}.${key}` : key),
        before: this.stringifyDiffValue(beforeObject[key]),
        after: this.stringifyDiffValue(afterObject[key])
      }));
  }

  private uniqueChangeRows(rows: ChangeRow[]): ChangeRow[] {
    const seen = new Set<string>();
    return rows.filter(row => {
      const key = `${row.field}:${row.before}:${row.after}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return row.before !== row.after;
    });
  }

  private stringifyDiffValue(value: unknown): string {
    if (value === undefined || value === null || value === '') return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private cleanFieldName(value: string): string {
    return value
      .replace(/request\./gi, '')
      .replace(/payload\./gi, '')
      .replace(/dto\./gi, '')
      .replace(/\.(before|after|old|new|previous|current)$/gi, '');
  }

  private toReadableFieldName(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, char => char.toLocaleUpperCase('vi-VN')) || value;
  }

  private topValues(values: string[], limit: number): string {
    const counts = values.reduce<Record<string, number>>((acc, value) => {
      const key = value || 'N/A';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([value, count]) => `${value} (${count})`)
      .join(', ');
  }

  private formatDateKey(value: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(value);
  }

  private matchesSearch(log: ActivityLog): boolean {
    const search = this.store.activitySearch().toLowerCase().trim();
    if (!search) {
      return true;
    }

    return [
      log.operatorEmail,
      log.operatorFullName,
      log.action,
      log.actionLabel,
      log.area,
      log.severity,
      log.module,
      log.targetType,
      log.targetId,
      log.targetLabel,
      log.target,
      log.summary,
      log.ipAddress
    ].some(value => (value || '').toString().toLowerCase().includes(search));
  }

  private toTitleCase(value: string): string {
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  private detectBrowser(userAgent: string): string {
    const rules: Array<[RegExp, string]> = [
      [/Edg\/([\d.]+)/, 'Microsoft Edge'],
      [/OPR\/([\d.]+)/, 'Opera'],
      [/Chrome\/([\d.]+)/, 'Google Chrome'],
      [/Firefox\/([\d.]+)/, 'Mozilla Firefox'],
      [/Version\/([\d.]+).*Safari/, 'Safari']
    ];

    for (const [regex, name] of rules) {
      const match = userAgent.match(regex);
      if (match?.[1]) {
        return `${name} ${this.majorVersion(match[1])}`;
      }
    }
    return 'Trình duyệt khác';
  }

  private detectOperatingSystem(userAgent: string): string {
    if (/Windows NT 10\.0/i.test(userAgent)) return 'Windows 10/11';
    if (/Windows NT 6\.3/i.test(userAgent)) return 'Windows 8.1';
    if (/Windows NT 6\.2/i.test(userAgent)) return 'Windows 8';
    if (/Windows NT 6\.1/i.test(userAgent)) return 'Windows 7';
    if (/Android/i.test(userAgent)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS / iPadOS';
    if (/Mac OS X/i.test(userAgent)) return 'macOS';
    if (/Linux/i.test(userAgent)) return 'Linux';
    return 'Hệ điều hành khác';
  }

  private detectDevice(userAgent: string): string {
    if (/iPad|Tablet/i.test(userAgent)) return 'Tablet';
    if (/Mobile|iPhone|Android/i.test(userAgent)) return 'Mobile';
    return 'Desktop';
  }

  private detectEngine(userAgent: string): string {
    const engineMatch = userAgent.match(/AppleWebKit\/([\d.]+)/);
    if (engineMatch?.[1]) return `AppleWebKit ${this.majorVersion(engineMatch[1])}`;
    const geckoMatch = userAgent.match(/Gecko\/([\d.]+)/);
    if (geckoMatch?.[1]) return `Gecko ${this.majorVersion(geckoMatch[1])}`;
    return 'Không xác định';
  }

  private browserIconText(browser: string): string {
    if (browser.includes('Chrome')) return 'C';
    if (browser.includes('Edge')) return 'E';
    if (browser.includes('Firefox')) return 'F';
    if (browser.includes('Safari')) return 'S';
    if (browser.includes('Opera')) return 'O';
    return '?';
  }

  private browserIconClass(browser: string): string {
    if (browser.includes('Chrome')) return 'brand-icon--chrome';
    if (browser.includes('Edge')) return 'brand-icon--edge';
    if (browser.includes('Firefox')) return 'brand-icon--firefox';
    if (browser.includes('Safari')) return 'brand-icon--safari';
    if (browser.includes('Opera')) return 'brand-icon--opera';
    return 'brand-icon--unknown';
  }

  private osIconText(os: string): string {
    if (os.includes('Windows')) return 'W';
    if (os.includes('macOS')) return 'M';
    if (os.includes('iOS')) return 'i';
    if (os.includes('Android')) return 'A';
    if (os.includes('Linux')) return 'L';
    return '?';
  }

  private osIconClass(os: string): string {
    if (os.includes('Windows')) return 'brand-icon--windows';
    if (os.includes('macOS') || os.includes('iOS')) return 'brand-icon--apple';
    if (os.includes('Android')) return 'brand-icon--android';
    if (os.includes('Linux')) return 'brand-icon--linux';
    return 'brand-icon--unknown';
  }

  private deviceIconText(device: string): string {
    if (device === 'Desktop') return 'PC';
    if (device === 'Mobile') return 'M';
    if (device === 'Tablet') return 'T';
    return '?';
  }

  private deviceIconClass(device: string): string {
    if (device === 'Desktop') return 'brand-icon--desktop';
    if (device === 'Mobile') return 'brand-icon--mobile';
    if (device === 'Tablet') return 'brand-icon--tablet';
    return 'brand-icon--unknown';
  }

  private majorVersion(version: string): string {
    return version.split('.')[0] || version;
  }

  private translateSummary(value: string): string {
    return value
      .replace(/\bCap nhat trang thai don hang\b/gi, 'cập nhật trạng thái đơn hàng')
      .replace(/\bCap nhat don hang\b/gi, 'cập nhật đơn hàng')
      .replace(/\bDieu chinh ton kho\b/gi, 'điều chỉnh tồn kho')
      .replace(/\bCap nhat ton kho\b/gi, 'cập nhật tồn kho')
      .replace(/\bCap nhat san pham\b/gi, 'cập nhật sản phẩm')
      .replace(/\bCap nhat tai khoan\b/gi, 'cập nhật tài khoản')
      .replace(/\bCap nhat ma giam gia\b/gi, 'cập nhật mã giảm giá')
      .replace(/\bTao tai khoan\b/gi, 'tạo tài khoản')
      .replace(/\bTao san pham\b/gi, 'tạo sản phẩm')
      .replace(/\bTao ma giam gia\b/gi, 'tạo mã giảm giá')
      .replace(/\bXoa tai khoan\b/gi, 'xóa tài khoản')
      .replace(/\bXoa san pham\b/gi, 'xóa sản phẩm')
      .replace(/\bXoa ma giam gia\b/gi, 'xóa mã giảm giá')
      .replace(/\bHuy don hang\b/gi, 'hủy đơn hàng')
      .replace(/\bKhach hang dat hang\b/gi, 'khách hàng đặt hàng')
      .replace(/\bAdmin thay doi vai tro tai khoan\b/gi, 'admin thay đổi vai trò tài khoản')
      .replace(/\bAdmin cap nhat trang thai tai khoan\b/gi, 'admin cập nhật trạng thái tài khoản')
      .replace(/\bAdmin tao tai khoan noi bo\b/gi, 'admin tạo tài khoản nội bộ')
      .replace(/\bAdmin xem chi tiet log\b/gi, 'admin xem chi tiết log')
      .replace(/\bAdmin xoa danh sach log dang hien thi\b/gi, 'admin xóa danh sách log đang hiển thị')
      .replace(/\bcap nhat\b/gi, 'cập nhật')
      .replace(/\bdang ky\b/gi, 'đăng ký')
      .replace(/\bbat\/tat\b/gi, 'bật/tắt')
      .replace(/\bcua\b/gi, 'của')
      .replace(/\btrang thai\b/gi, 'trạng thái')
      .replace(/\bdon hang\b/gi, 'đơn hàng')
      .replace(/\bton kho\b/gi, 'tồn kho')
      .replace(/\bsan pham\b/gi, 'sản phẩm')
      .replace(/\bma giam gia\b/gi, 'mã giảm giá')
      .replace(/\bnoi bo\b/gi, 'nội bộ')
      .replace(/\bchi tiet\b/gi, 'chi tiết')
      .replace(/\bdanh sach\b/gi, 'danh sách')
      .replace(/\bdang hien thi\b/gi, 'đang hiển thị')
      .replace(/\bdang nhap Google\b/gi, 'đăng nhập Google')
      .replace(/\bdang nhap he thong\b/gi, 'đăng nhập hệ thống')
      .replace(/\bdang xuat he thong\b/gi, 'đăng xuất hệ thống')
      .replace(/\bdang nhap\b/gi, 'đăng nhập')
      .replace(/\bdang xuat\b/gi, 'đăng xuất')
      .replace(/\bdoi mat khau\b/gi, 'đổi mật khẩu')
      .replace(/\bkhach hang\b/gi, 'khách hàng')
      .replace(/\btai khoan\b/gi, 'tài khoản');
  }
  private formatSentence(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return trimmed;
    }
    const leadingEmail = trimmed.match(/^[^\s@]+@[^\s@]+\.[^\s@]+/);
    if (leadingEmail) {
      const email = leadingEmail[0];
      const rest = trimmed.slice(email.length);
      return `${email}${this.capitalizeFirstLetter(rest)}`;
    }
    return this.capitalizeFirstLetter(trimmed);
  }

  private capitalizeFirstLetter(value: string): string {
    const firstLetterIndex = value.search(/\p{L}/u);
    if (firstLetterIndex === -1) {
      return value;
    }
    return value.slice(0, firstLetterIndex)
      + value.charAt(firstLetterIndex).toLocaleUpperCase('vi-VN')
      + value.slice(firstLetterIndex + 1);
  }
}
