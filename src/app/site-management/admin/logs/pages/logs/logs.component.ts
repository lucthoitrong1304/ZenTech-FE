import { Component, OnDestroy, OnInit, inject, signal, computed, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  LucideSearch,
  LucideTrash2,
  LucideChevronDown,
  LucideBot,
  LucideCopy,
  LucideRefreshCw,
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

interface LogJourneyItem {
  id: string;
  time: Date;
  title: string;
  description: string;
  level: LogLevel;
  category: string;
  isCurrent: boolean;
}

enum LogViewTab {
  STREAM = 'STREAM',
  ISSUES = 'ISSUES',
}

enum LogTimeRange {
  MINUTES_15 = 'MINUTES_15',
  HOUR_1 = 'HOUR_1',
  HOURS_6 = 'HOURS_6',
  HOURS_24 = 'HOURS_24',
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
  selector: 'app-admin-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideSearch,
    LucideTrash2,
    LucideChevronDown,
    LucideBot,
    LucideCopy,
    LucideRefreshCw,
    LucideGlobe,
    LucideTerminal,
    LucideSparkles
  ],
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.css'
})
export class LogsComponent implements OnInit, OnDestroy {
  protected readonly store = inject(AdminStore);
  protected readonly toastService = inject(ToastService);
  protected readonly LogLevel = LogLevel;
  protected readonly LogServiceCategory = LogServiceCategory;

  protected readonly LogViewTab = LogViewTab;
  protected readonly LogTimeRange = LogTimeRange;

  protected readonly activeFilter = signal<LogLevel | 'ALL'>('ALL');
  protected readonly activeService = signal<LogServiceCategory>(LogServiceCategory.ALL); // Lọc theo SERVICE nguồn
  protected readonly searchText = signal('');
  protected readonly selectedLog = signal<SystemLog | null>(null);
  protected readonly selectedIssue = signal<LogIssue | null>(null);
  protected readonly selectedIssueReturn = signal<LogIssue | null>(null);
  protected readonly activeTab = signal<LogViewTab>(LogViewTab.STREAM);
  protected readonly activeTimeRange = signal<LogTimeRange>(LogTimeRange.HOUR_1);
  protected readonly autoRefreshEnabled = signal(true);
  protected readonly visibleLogCount = signal(50);
  protected readonly visibleIssueCount = signal(20);
  protected readonly logPageSize = 50;
  protected readonly issuePageSize = 20;
  protected readonly wsService = inject(WebsocketService);
  private readonly ngZone = inject(NgZone);
  private wsSubscription: Subscription | null = null;

  // Lưu trạng thái xem chế độ của từng log (structured hoặc raw)
  protected readonly viewModeMap = signal<Record<string, 'structured' | 'raw'>>({});
  // Lưu kết quả AI giải thích theo logId
  protected readonly explanations = signal<Record<string, string>>({});
  // Lưu trạng thái đang gọi AI giải thích của từng logId
  protected readonly explainingIds = signal<Record<string, boolean>>({});

  ngOnInit(): void {
    // Tải logs lần đầu
    this.store.loadLogs({ level: 'ALL', search: '', traceId: '' });
    this.store.loadIssueLogs({ search: '', traceId: '' });
    this.startRealtimeLogs();
  }

  ngOnDestroy(): void {
    this.stopRealtimeLogs();
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

  protected readonly visibleLogs = computed(() => this.displayedLogs().slice(0, this.visibleLogCount()));
  protected readonly visibleIssues = computed(() => this.displayedIssues().slice(0, this.visibleIssueCount()));

  protected handleFilterChange(filter: LogLevel | 'ALL'): void {
    this.activeFilter.set(filter);
    this.store.setLogFilter(filter);
    this.resetVisibleCounts();

    if (filter === 'ALL') {
      this.store.loadIssueLogs({ search: this.searchText(), traceId: '' });
    }
  }

  protected handleServiceChange(service: LogServiceCategory): void {
    this.activeService.set(service);
    this.resetVisibleCounts();
  }

  protected handleTabChange(tab: LogViewTab): void {
    this.activeTab.set(tab);
  }

  protected handleTimeRangeChange(range: LogTimeRange): void {
    this.activeTimeRange.set(range);
    this.resetVisibleCounts();
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
    }
  }

  private filterLogsByTimeRange(logs: SystemLog[]): SystemLog[] {
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
    }
  }

  protected openIssueDetails(issue: LogIssue): void {
    this.selectedIssue.set(issue);
  }

  protected closeIssueDetails(): void {
    this.selectedIssue.set(null);
  }

  protected filterIssueLogs(issue: LogIssue): void {
    this.activeTab.set(LogViewTab.STREAM);
    this.searchText.set(issue.signature);
    this.store.setLogSearch(issue.signature);
    this.selectedIssue.set(null);
  }

  private normalizeServiceCategory(category: string): LogServiceCategory {
    const normalizedCategory = category.toUpperCase();

    if (normalizedCategory === LogServiceCategory.FRONTEND) {
      return LogServiceCategory.FRONTEND;
    }

    if (normalizedCategory === LogServiceCategory.AI_SERVICE || normalizedCategory === 'AI_SERVICE') {
      return LogServiceCategory.AI_SERVICE;
    }

    return LogServiceCategory.BACKEND;
  }

  protected handleSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    this.store.setLogSearch(value);
    this.resetVisibleCounts();

    if (this.activeFilter() === 'ALL') {
      this.store.loadIssueLogs({ search: value, traceId: '' });
    }
  }

  protected openLogDetails(log: SystemLog): void {
    this.selectedIssueReturn.set(null);
    this.selectedLog.set(log);
    this.auditLogDetailView(log);
  }

  protected openRelatedLogDetails(issue: LogIssue, log: SystemLog): void {
    this.selectedIssueReturn.set(issue);
    this.selectedIssue.set(null);
    this.selectedLog.set(log);
    this.auditLogDetailView(log);
  }

  protected backToIssueDetails(): void {
    const issue = this.selectedIssueReturn();

    if (!issue) {
      return;
    }

    this.selectedLog.set(null);
    this.selectedIssue.set(issue);
    this.selectedIssueReturn.set(null);
  }

  protected closeLogDetails(): void {
    this.selectedLog.set(null);
    this.selectedIssueReturn.set(null);
  }

  protected loadMoreLogs(): void {
    this.visibleLogCount.update(count => count + this.logPageSize);
  }

  protected loadMoreIssues(): void {
    this.visibleIssueCount.update(count => count + this.issuePageSize);
  }

  private resetVisibleCounts(): void {
    this.visibleLogCount.set(this.logPageSize);
    this.visibleIssueCount.set(this.issuePageSize);
  }

  protected getLogViewMode(logId: string): 'structured' | 'raw' {
    return this.viewModeMap()[logId] || 'structured';
  }

  protected setLogViewMode(logId: string, mode: 'structured' | 'raw'): void {
    this.viewModeMap.update(map => ({ ...map, [logId]: mode }));
  }

  protected handleExplainLog(logItem: SystemLog): void {
    const logId = logItem.id;
    if (this.explanations()[logId] || this.explainingIds()[logId]) return;

    this.explainingIds.update(map => ({ ...map, [logId]: true }));

    this.store.explainLog(
      logItem.message,
      logItem.details,
      logItem.category || LogServiceCategory.BACKEND,
      (explanation) => {
        this.explanations.update(map => ({ ...map, [logId]: explanation }));
        this.explainingIds.update(map => ({ ...map, [logId]: false }));
      },
      () => {
        this.explainingIds.update(map => ({ ...map, [logId]: false }));
      }
    );
  }

  protected filterByTraceId(traceId: string, event: Event): void {
    event.stopPropagation(); // Tránh kích hoạt toggle đóng mở dòng
    if (!traceId) return;
    this.searchText.set(traceId);
    this.store.setLogSearch(traceId);
  }

  protected applyLevelFilter(level: LogLevel, event: Event): void {
    event.stopPropagation();
    this.handleFilterChange(level);
  }

  protected applyServiceFilter(category: string, event: Event): void {
    event.stopPropagation();
    this.handleServiceChange(this.normalizeServiceCategory(category));
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

  protected getIndexedLabels(log: SystemLog): LogMetadataItem[] {
    const service = this.normalizeServiceCategory(log.category);
    const filename = service === LogServiceCategory.AI_SERVICE
      ? '/logs/ai.log'
      : service === LogServiceCategory.FRONTEND
        ? '/logs/frontend.log'
        : '/logs/backend.log';

    return [
      { label: 'service', value: service.toLowerCase() },
      { label: 'service_name', value: service.toLowerCase() },
      { label: 'filename', value: filename },
    ];
  }

  protected getUserJourney(log: SystemLog): LogJourneyItem[] {
    const currentContext = this.parseClientLogStack(log.details);
    const currentTime = new Date(log.timestamp).getTime();
    const journeyWindowMs = 10 * 60 * 1000;

    return this.store.logs()
      .filter(candidate => this.isJourneyCandidate(candidate, log, currentContext, currentTime, journeyWindowMs))
      .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
      .slice(-8)
      .map(candidate => this.toJourneyItem(candidate, log.id));
  }

  private isJourneyCandidate(
    candidate: SystemLog,
    currentLog: SystemLog,
    currentContext: ClientLogStackContext | null,
    currentTime: number,
    journeyWindowMs: number
  ): boolean {
    const candidateTime = new Date(candidate.timestamp).getTime();

    if (candidateTime > currentTime || currentTime - candidateTime > journeyWindowMs) {
      return false;
    }

    if (candidate.id === currentLog.id) {
      return true;
    }

    if (currentLog.traceId && candidate.traceId === currentLog.traceId) {
      return true;
    }

    const candidateContext = this.parseClientLogStack(candidate.details);

    if (currentContext?.routeUrl && candidateContext?.routeUrl === currentContext.routeUrl) {
      return true;
    }

    return this.normalizeServiceCategory(candidate.category) === LogServiceCategory.FRONTEND;
  }

  private toJourneyItem(log: SystemLog, currentLogId: string): LogJourneyItem {
    const context = this.parseClientLogStack(log.details);
    const title = this.toFriendlyJourneyTitle(context?.eventType, log.message);
    const routeText = context?.routeUrl ? `Route: ${context.routeUrl}` : '';
    const apiText = context?.apiPath ? `API: ${context.method || 'HTTP'} ${this.normalizeApiPath(context.apiPath)}` : '';
    const reasonText = context?.reason ? `Reason: ${context.reason}` : '';
    const description = [routeText, apiText, reasonText].filter(Boolean).join(' · ') || log.message;

    return {
      id: log.id,
      time: new Date(log.timestamp),
      title,
      description,
      level: log.level,
      category: log.category,
      isCurrent: log.id === currentLogId,
    };
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

  protected copyToClipboard(text: string, event: Event): void {
    event.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      this.toastService.success('Đã sao chép nội dung log!');
    });
  }

  protected handleRefreshLogs(): void {
    this.store.loadLogs({
      level: this.activeFilter(),
      search: this.searchText(),
      traceId: ''
    });

    if (this.activeFilter() === 'ALL') {
      this.store.loadIssueLogs({
        search: this.searchText(),
        traceId: ''
      });
    }
    this.toastService.success('Đã làm mới danh sách nhật ký');
  }

  protected toggleAutoRefresh(): void {
    const nextState = !this.autoRefreshEnabled();
    this.autoRefreshEnabled.set(nextState);

    if (nextState) {
      this.startRealtimeLogs();
      this.toastService.success('Đã bật chế độ log thời gian thực (Real-time logs)');
      return;
    }

    this.stopRealtimeLogs();
    this.toastService.success('Đã tắt chế độ log thời gian thực');
  }

  private startRealtimeLogs(): void {
    this.stopRealtimeLogs();
    console.log('[Logs WS] Khởi tạo kết nối và đăng ký lắng nghe /topic/admin.logs');
    this.wsService.connect();
    
    // Subscribe to websocket log topic
    this.wsSubscription = this.wsService.subscribe<SystemLog>('/topic/admin.logs')
      .subscribe({
        next: (logItem: SystemLog) => {
          console.log('[Logs WS] Nhận log mới từ WS:', logItem);
          this.ngZone.run(() => {
            this.store.appendLog(logItem);
          });
        },
        error: (err: unknown) => {
          console.error('[Logs WS Subscription Error]', err);
        }
      });
  }

  private stopRealtimeLogs(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
      this.wsSubscription = null;
    }
  }

  protected handleClearLogs(): void {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ logs hiện tại không?')) {
      this.store.recordActivityLog({
        action: 'CLEAR_LOG',
        area: ActivityArea.ADMIN,
        severity: ActivitySeverity.SECURITY,
        module: 'LOG',
        targetType: 'LOG',
        targetLabel: 'Danh sách log hiển thị',
        summary: 'Admin xóa danh sách log đang hiển thị'
      });
      this.store.clearLogs();
    }
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
      summary: `Admin xem chi tiết log ${log.level} của ${log.category}`,
      metadata: JSON.stringify({
        level: log.level,
        category: log.category,
        traceId: log.traceId,
        message: log.message
      })
    });
  }
}
