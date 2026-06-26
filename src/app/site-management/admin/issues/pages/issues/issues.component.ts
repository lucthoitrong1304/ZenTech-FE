import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, inject, signal, computed, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  LucideSearch,
  LucideRefreshCw,
  LucideBot,
  LucideCopy,
  LucideGlobe,
  LucideTerminal,
  LucideSparkles
} from '@lucide/angular';
import { AdminStore } from '../../../data-access/store/admin.store';
import { ActivityArea, ActivitySeverity, LogLevel, LogServiceCategory, SystemLog } from '../../../data-access/models/admin.models';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { WebsocketService } from '../../../../../core/services/websocket.service';

interface LogMetadataItem {
  label: string;
  value: string;
}

enum LogTimeRange {
  MINUTES_15 = 'MINUTES_15',
  HOUR_1 = 'HOUR_1',
  HOURS_6 = 'HOURS_6',
  HOURS_24 = 'HOURS_24',
  CUSTOM = 'CUSTOM',
}

interface LogIssue {
  id: string;
  title: string;
  signature: string;
  level: LogLevel;
  category: string;
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  traceIds: string[];
  logs: SystemLog[];
}

interface ClientLogStackContext {
  eventType?: string;
  routeUrl?: string;
  traceId?: string;
  method?: string;
  apiPath?: string;
  statusCode?: number;
  durationMs?: number | null;
  userEmail?: string | null;
  userRole?: string | null;
  productId?: string | null;
  orderId?: string | null;
  quantity?: number | null;
  result?: string | null;
  reason?: string | null;
}

@Component({
  selector: 'app-admin-issues',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideSearch,
    LucideRefreshCw,
    LucideBot,
    LucideCopy,
    LucideGlobe,
    LucideTerminal,
    LucideSparkles
  ],
  templateUrl: './issues.component.html',
  styleUrl: './issues.component.css'
})
export class IssuesComponent implements OnInit, OnDestroy {
  protected readonly store = inject(AdminStore);
  protected readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  protected readonly LogLevel = LogLevel;
  protected readonly LogServiceCategory = LogServiceCategory;
  protected readonly LogTimeRange = LogTimeRange;

  protected readonly activeFilter = signal<LogLevel | 'ALL'>('ALL');
  protected readonly activeService = signal<LogServiceCategory>(LogServiceCategory.ALL);
  protected readonly searchText = signal('');
  protected readonly selectedLog = signal<SystemLog | null>(null);
  protected readonly selectedIssue = signal<LogIssue | null>(null);
  protected readonly selectedIssueReturn = signal<LogIssue | null>(null);
  protected readonly activeTimeRange = signal<LogTimeRange>(LogTimeRange.HOUR_1);
  protected readonly autoRefreshEnabled = signal(true);
  protected readonly visibleIssueCount = signal(20);
  protected readonly issuePageSize = 20;
  protected readonly wsService = inject(WebsocketService);
  private readonly ngZone = inject(NgZone);
  private wsSubscription: Subscription | null = null;

  // Lọc khoảng thời gian tùy chọn
  protected readonly customStartTime = signal<Date | null>(null);
  protected readonly customEndTime = signal<Date | null>(null);

  protected readonly customStartTimeString = computed(() => {
    const date = this.customStartTime();
    return date ? this.formatDateToLocalInput(date) : '';
  });

  protected readonly customEndTimeString = computed(() => {
    const date = this.customEndTime();
    return date ? this.formatDateToLocalInput(date) : '';
  });

  // Lưu trạng thái xem chế độ của từng log (structured hoặc raw)
  protected readonly viewModeMap = signal<Record<string, 'structured' | 'raw'>>({});
  // Lưu kết quả AI giải thích theo logId
  protected readonly explanations = signal<Record<string, string>>({});
  // Lưu trạng thái đang gọi AI giải thích của từng logId
  protected readonly explainingIds = signal<Record<string, boolean>>({});

  ngOnInit(): void {
    const search = this.route.snapshot.queryParamMap.get('search')?.trim() ?? '';
    const service = this.route.snapshot.queryParamMap.get('service') as LogServiceCategory | null;
    if (search) {
      this.searchText.set(search);
      this.store.setLogSearch(search);
    }
    if (service && Object.values(LogServiceCategory).includes(service)) {
      this.activeService.set(service);
    }
    this.reloadLogsFromServer();
    this.startRealtimeLogs();
  }

  ngOnDestroy(): void {
    this.stopRealtimeLogs();
  }

  protected toggleAutoRefresh(): void {
    const nextState = !this.autoRefreshEnabled();
    this.autoRefreshEnabled.set(nextState);

    if (nextState) {
      this.startRealtimeLogs();
      this.toastService.success('Đã bật chế độ Vấn đề thời gian thực (Real-time issues)');
      return;
    }

    this.stopRealtimeLogs();
    this.toastService.success('Đã tắt chế độ Vấn đề thời gian thực');
  }

  private startRealtimeLogs(): void {
    this.stopRealtimeLogs();
    console.log('[Issues WS] Khởi tạo kết nối và đăng ký lắng nghe /topic/admin.logs');
    this.wsService.connect();
    
    this.wsSubscription = this.wsService.subscribe<SystemLog>('/topic/admin.logs')
      .subscribe({
        next: (logItem: SystemLog) => {
          console.log('[Issues WS] Nhận log mới từ WS:', logItem);
          this.ngZone.run(() => {
            this.store.appendLog(logItem);
          });
        },
        error: (err: unknown) => {
          console.error('[Issues WS Subscription Error]', err);
        }
      });
  }

  private stopRealtimeLogs(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
      this.wsSubscription = null;
    }
  }

  protected readonly displayedLogs = computed(() => {
    const logs = this.filterLogsByTimeRange(this.store.filteredLogs());
    const service = this.activeService();

    if (service === LogServiceCategory.ALL) {
      return logs;
    }

    return logs.filter(log => this.normalizeServiceCategory(log.category) === service);
  });

  protected readonly displayedIssues = computed(() => {
    const issueLogs = this.activeFilter() === 'ALL'
      ? this.filterLogsByTimeRange(this.store.filteredIssueLogs())
      : this.displayedLogs();
    const service = this.activeService();
    const scopedIssueLogs = service === LogServiceCategory.ALL
      ? issueLogs
      : issueLogs.filter(log => this.normalizeServiceCategory(log.category) === service);

    return this.buildIssues(scopedIssueLogs);
  });

  protected readonly visibleIssues = computed(() => this.displayedIssues().slice(0, this.visibleIssueCount()));

  protected handleFilterChange(filter: LogLevel | 'ALL'): void {
    this.activeFilter.set(filter);
    this.resetVisibleCounts();
    this.reloadLogsFromServer();
  }

  protected handleServiceChange(service: LogServiceCategory): void {
    this.activeService.set(service);
    this.resetVisibleCounts();
  }

  protected handleTimeRangeChange(range: LogTimeRange): void {
    this.activeTimeRange.set(range);
    this.resetVisibleCounts();

    if (range === LogTimeRange.CUSTOM) {
      this.autoRefreshEnabled.set(false);
      this.stopRealtimeLogs();
      // Khởi tạo mặc định: bắt đầu từ 1 tiếng trước, kết thúc ở hiện tại
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      this.customStartTime.set(oneHourAgo);
      this.customEndTime.set(now);
      this.reloadLogsFromServer();
    } else {
      this.reloadLogsFromServer();
    }
  }

  protected getTimeRangeLabel(range: LogTimeRange): string {
    switch (range) {
      case LogTimeRange.MINUTES_15:
        return '15m';
      case LogTimeRange.HOUR_1:
        return '1h';
      case LogTimeRange.HOURS_6:
        return '6h';
      case LogTimeRange.HOURS_24:
        return '24h';
      case LogTimeRange.CUSTOM:
        return 'Tùy chọn';
    }
  }

  private filterLogsByTimeRange(logs: SystemLog[]): SystemLog[] {
    if (this.activeTimeRange() === LogTimeRange.CUSTOM) {
      const start = this.customStartTime();
      const end = this.customEndTime();
      return logs.filter(log => {
        const time = new Date(log.timestamp).getTime();
        if (start && time < start.getTime()) return false;
        if (end && time > end.getTime()) return false;
        return true;
      });
    }

    const now = Date.now();
    const cutoffTime = now - this.getTimeRangeMs(this.activeTimeRange());

    return logs.filter(log => new Date(log.timestamp).getTime() >= cutoffTime);
  }

  private getTimeRangeMs(range: LogTimeRange): number {
    switch (range) {
      case LogTimeRange.MINUTES_15:
        return 15 * 60 * 1000;
      case LogTimeRange.HOUR_1:
        return 60 * 60 * 1000;
      case LogTimeRange.HOURS_6:
        return 6 * 60 * 60 * 1000;
      case LogTimeRange.HOURS_24:
        return 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000;
    }
  }

  protected handleCustomStartTimeChange(value: string): void {
    if (value) {
      this.customStartTime.set(new Date(value));
    } else {
      this.customStartTime.set(null);
    }
  }

  protected handleCustomEndTimeChange(value: string): void {
    if (value) {
      this.customEndTime.set(new Date(value));
    } else {
      this.customEndTime.set(null);
    }
  }

  protected handleApplyCustomRange(): void {
    const start = this.customStartTime();
    const end = this.customEndTime();
    if (!start || !end) {
      this.toastService.warning('Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc');
      return;
    }
    if (start.getTime() > end.getTime()) {
      this.toastService.error('Thời gian bắt đầu không thể lớn hơn thời gian kết thúc');
      return;
    }

    this.reloadLogsFromServer();
    this.toastService.success('Đã áp dụng khoảng thời gian tự chọn');
  }

  private reloadLogsFromServer(): void {
    let startTime: number | undefined;
    let endTime: number | undefined;

    const range = this.activeTimeRange();
    if (range === LogTimeRange.CUSTOM) {
      startTime = this.customStartTime()?.getTime();
      endTime = this.customEndTime()?.getTime();
      if (!startTime || !endTime) {
        return;
      }
    } else {
      const now = Date.now();
      startTime = now - this.getTimeRangeMs(range);
      endTime = now;
    }

    const search = this.searchText().trim();
    const isTraceId = search.startsWith('ZT-') && search.length > 5;

    this.store.loadLogs({
      level: this.activeFilter(),
      search: isTraceId ? '' : search,
      traceId: isTraceId ? search : '',
      startTime,
      endTime
    });

    if (this.activeFilter() === 'ALL') {
      this.store.loadIssueLogs({
        search: isTraceId ? '' : search,
        traceId: isTraceId ? search : '',
        startTime,
        endTime
      });
    }
  }

  private formatDateToLocalInput(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
  }

  protected openIssueDetails(issue: LogIssue): void {
    this.selectedIssue.set(issue);
  }

  protected closeIssueDetails(): void {
    this.selectedIssue.set(null);
  }

  protected openRelatedLogDetails(issue: LogIssue, log: SystemLog): void {
    this.selectedIssueReturn.set(issue);
    this.selectedIssue.set(null);
    this.selectedLog.set(log);
    this.auditLogDetailView(log);
  }

  protected closeLogDetails(): void {
    this.selectedLog.set(null);
    this.selectedIssueReturn.set(null);
  }

  protected backToIssueDetails(): void {
    const issue = this.selectedIssueReturn();
    if (issue) {
      this.selectedIssue.set(issue);
    }
    this.selectedLog.set(null);
    this.selectedIssueReturn.set(null);
  }

  protected handleSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    this.store.setLogSearch(value);
    this.resetVisibleCounts();
    this.reloadLogsFromServer();
  }

  protected handleRefreshLogs(): void {
    this.reloadLogsFromServer();
    this.toastService.success('Đã làm mới danh sách Vấn đề');
  }

  protected loadMoreIssues(): void {
    this.visibleIssueCount.update(count => count + this.issuePageSize);
  }

  private resetVisibleCounts(): void {
    this.visibleIssueCount.set(this.issuePageSize);
  }

  protected normalizeServiceCategory(category: string): LogServiceCategory {
    const normalizedCategory = category.toUpperCase().trim();

    if (normalizedCategory === LogServiceCategory.FRONTEND) {
      return LogServiceCategory.FRONTEND;
    }

    if (normalizedCategory === LogServiceCategory.AI_SERVICE || normalizedCategory === 'AI_SERVICE') {
      return LogServiceCategory.AI_SERVICE;
    }

    return LogServiceCategory.BACKEND;
  }

  protected getLogViewMode(logId: string): 'structured' | 'raw' {
    return this.viewModeMap()[logId] || 'structured';
  }

  protected setLogViewMode(logId: string, mode: 'structured' | 'raw'): void {
    this.viewModeMap.update(map => ({ ...map, [logId]: mode }));
  }

  protected triggerAiExplanation(log: SystemLog): void {
    const logId = log.id;
    this.explainingIds.update(map => ({ ...map, [logId]: true }));

    const service = this.normalizeServiceCategory(log.category);
    const logDetails = log.details || log.message;

    this.store.explainLog(
      log.message,
      logDetails,
      service,
      (explanation: string) => {
        this.explanations.update(map => ({ ...map, [logId]: explanation }));
        this.explainingIds.update(map => ({ ...map, [logId]: false }));
      },
      () => {
        this.explainingIds.update(map => ({ ...map, [logId]: false }));
      }
    );
  }

  protected getStructuredMetadata(log: SystemLog): LogMetadataItem[] {
    const stackContext = this.parseClientLogStack(log.details);
    const metadata: LogMetadataItem[] = [
      { label: 'detected_level', value: log.level.toLowerCase() },
      { label: 'source', value: log.category },
      { label: 'timestamp', value: this.formatLogDateTime(log.timestamp) },
    ];

    if (log.traceId) {
      metadata.push({ label: 'trace_id', value: log.traceId });
    }

    if (stackContext?.eventType) {
      metadata.push({ label: 'event_type', value: stackContext.eventType });
    }

    if (stackContext?.routeUrl) {
      metadata.push({ label: 'route_url', value: stackContext.routeUrl });
    }

    if (stackContext?.method) {
      metadata.push({ label: 'method', value: stackContext.method });
    }

    if (stackContext?.apiPath) {
      metadata.push({ label: 'api_path', value: stackContext.apiPath });
    }

    if (stackContext?.statusCode !== undefined) {
      metadata.push({ label: 'status_code', value: String(stackContext.statusCode) });
    }

    if (stackContext?.reason) {
      metadata.push({ label: 'reason', value: stackContext.reason });
    }

    return metadata;
  }

  protected copyToClipboard(text: string, event: Event): void {
    event.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      this.toastService.success('Đã sao chép nội dung log!');
    });
  }

  private buildIssues(logs: SystemLog[]): LogIssue[] {
    const issueMap = new Map<string, LogIssue>();

    logs
      .filter(log => log.level === LogLevel.ERROR || log.level === LogLevel.WARN)
      .forEach(log => {
        const signature = this.getIssueSignature(log);
        const existingIssue = issueMap.get(signature);
        const timestamp = new Date(log.timestamp);

        if (!existingIssue) {
          issueMap.set(signature, {
            id: signature,
            title: this.getIssueTitle(log),
            signature,
            level: log.level,
            category: log.category,
            occurrences: 1,
            firstSeen: timestamp,
            lastSeen: timestamp,
            traceIds: log.traceId ? [log.traceId] : [],
            logs: [log],
          });
          return;
        }

        existingIssue.logs.push(log);
        existingIssue.occurrences += 1;
        existingIssue.firstSeen = timestamp < existingIssue.firstSeen ? timestamp : existingIssue.firstSeen;
        existingIssue.lastSeen = timestamp > existingIssue.lastSeen ? timestamp : existingIssue.lastSeen;

        if (log.traceId && !existingIssue.traceIds.includes(log.traceId)) {
          existingIssue.traceIds.push(log.traceId);
        }
      });

    return Array.from(issueMap.values())
      .sort((left, right) => right.lastSeen.getTime() - left.lastSeen.getTime());
  }

  private getIssueTitle(log: SystemLog): string {
    const context = this.parseClientLogStack(log.details);

    if (context?.eventType && context.apiPath) {
      return `${this.toFriendlyJourneyTitle(context.eventType, log.message)} · ${context.method || 'HTTP'} ${this.normalizeApiPath(context.apiPath)}`;
    }

    return log.message.split('|')[0]?.trim() || log.message;
  }

  private getIssueSignature(log: SystemLog): string {
    const context = this.parseClientLogStack(log.details);
    const baseMessage = this.normalizeIssueMessage(log.message);
    const apiPart = context?.apiPath ? this.normalizeApiPath(context.apiPath) : baseMessage;
    const eventPart = context?.eventType || baseMessage;

    return `${log.level}:${this.normalizeServiceCategory(log.category)}:${eventPart}:${apiPart}`;
  }

  private normalizeIssueMessage(message: string): string {
    return message
      .replace(/ZT-[A-Za-z0-9_-]+/g, 'ZT-*')
      .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':uuid')
      .replace(/\d+/g, ':id')
      .trim();
  }

  private parseClientLogStack(details: string): ClientLogStackContext | null {
    const stackMarker = 'Stack:';
    const stackStartIndex = details.indexOf(stackMarker);

    if (stackStartIndex < 0) {
      return null;
    }

    const rawStack = details.slice(stackStartIndex + stackMarker.length).trim();

    if (!rawStack.startsWith('{')) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawStack) as unknown;

      if (typeof parsed !== 'object' || parsed === null) {
        return null;
      }

      return parsed as ClientLogStackContext;
    } catch {
      return null;
    }
  }

  private toFriendlyJourneyTitle(eventType: string | undefined, fallbackMessage: string): string {
    switch (eventType) {
      case 'HttpRequestSucceeded':
        return 'Gọi API thành công';
      case 'HttpRequestFailed':
        return 'Gọi API thất bại';
      case 'RouteNavigated':
        return 'Điều hướng trang';
      case 'ProductViewed':
        return 'Xem sản phẩm';
      case 'CartItemAdded':
        return 'Thêm sản phẩm vào giỏ';
      case 'AuthLoginSucceeded':
        return 'Đăng nhập thành công';
      case 'AuthLoginFailed':
        return 'Đăng nhập thất bại';
      case 'RouteGuardDenied':
        return 'Bị chặn truy cập';
      default:
        return eventType || fallbackMessage.split('|')[0]?.trim() || fallbackMessage;
    }
  }

  private normalizeApiPath(apiPath: string): string {
    try {
      const url = new URL(apiPath);
      return url.pathname;
    } catch {
      return apiPath;
    }
  }

  private formatLogDateTime(value: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour12: false,
    }).format(new Date(value));
  }

  private auditLogDetailView(log: SystemLog): void {
    this.store.recordActivityLog({
      action: 'VIEW_LOG_DETAIL',
      area: ActivityArea.ADMIN,
      severity: ActivitySeverity.SECURITY,
      module: 'LOG',
      targetType: 'LOG',
      targetId: log.id,
      targetLabel: log.traceId || log.id,
      summary: `Admin xem chi tiết log ${log.level} của ${log.category} từ danh sách Issue`,
      metadata: JSON.stringify({
        level: log.level,
        category: log.category,
        traceId: log.traceId,
        message: log.message
      })
    });
  }
}
