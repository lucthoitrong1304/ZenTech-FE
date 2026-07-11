import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, inject, signal, computed, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MarkdownComponent } from 'ngx-markdown';
import {
  LucideSearch,
  LucideTrash2,
  LucideBot,
  LucideCopy,
  LucideRefreshCw,
  LucideGlobe,
  LucideTerminal,
  LucideSparkles,
  LucideUser,
  LucideSend
} from '@lucide/angular';
import { AdminStore } from '../../../data-access/store/admin.store';
import { AdminLogsService } from '../../../data-access/services/admin-logs.service';
import { ActivityArea, ActivitySeverity, LogLevel, LogServiceCategory, SystemLog } from '../../../data-access/models/admin.models';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { WebsocketService } from '../../../../../core/services/websocket.service';
import { AuthStorageService } from '../../../../../core/services/auth-storage.service';
import { normalizeTraceIdInput } from '../../../../../core/observability/tracing/trace-id.util';
import { AdminRecordingEvidenceComponent } from '../../../shared/recording-evidence/admin-recording-evidence.component';

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
  step: number;
  timeLabel: string;
  deltaLabel: string;
  flowLabel: string;
}

interface LogFlowSummary {
  flow: string;
  result: string;
  duration: string;
  api: string;
}

interface LogClassification {
  label: string;
  tone: 'business' | 'system' | 'auth' | 'network' | 'ai' | 'client' | 'normal';
}



enum LogTimeRange {
  TODAY = 'TODAY',
  MINUTES_15 = 'MINUTES_15',
  HOUR_1 = 'HOUR_1',
  HOURS_6 = 'HOURS_6',
  HOURS_24 = 'HOURS_24',
  CUSTOM = 'CUSTOM',
}



interface ClientLogStackContext {
  eventType?: string;
  routeUrl?: string;
  traceId?: string;
  method?: string;
  apiPath?: string;
  statusCode?: number;
  durationMs?: number | null;
  userId?: string | null;
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideSearch,
    LucideTrash2,
    LucideBot,
    LucideCopy,
    LucideRefreshCw,
    LucideGlobe,
    LucideTerminal,
    LucideSparkles,
    LucideUser,
    LucideSend,
    MarkdownComponent,
    AdminRecordingEvidenceComponent
  ],
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.css'
})
export class LogsComponent implements OnInit, OnDestroy {
  protected readonly store = inject(AdminStore);
  protected readonly toastService = inject(ToastService);
  private readonly authStorageService = inject(AuthStorageService);
  private readonly adminLogsService = inject(AdminLogsService);
  protected readonly LogLevel = LogLevel;
  protected readonly LogServiceCategory = LogServiceCategory;

  protected readonly LogTimeRange = LogTimeRange;

  protected readonly activeFilter = signal<LogLevel | 'ALL'>('ALL');
  protected readonly activeService = signal<LogServiceCategory>(LogServiceCategory.ALL); // Lọc theo SERVICE nguồn
  protected readonly searchText = signal('');
  protected readonly selectedLog = signal<SystemLog | null>(null);
  protected readonly journeyTraceLogs = signal<Record<string, SystemLog[]>>({});
  protected readonly activeTimeRange = signal<LogTimeRange>(LogTimeRange.TODAY);
  protected readonly autoRefreshEnabled = signal(true);
  protected readonly hideNoiseLogs = signal(true);
  protected readonly visibleLogCount = signal(50);
  protected readonly logPageSize = 50;
  protected readonly wsService = inject(WebsocketService);
  private readonly ngZone = inject(NgZone);
  private readonly route = inject(ActivatedRoute);
  private wsSubscription: Subscription | null = null;
  private routeSubscription: Subscription | null = null;
  private journeyTraceSubscription: Subscription | null = null;

  protected readonly chatHistories = signal<Record<string, Array<{ role: 'user' | 'assistant'; content: string }>>>({});
  protected readonly chatInputs = signal<Record<string, string>>({});
  protected readonly sendingChatIds = signal<Record<string, boolean>>({});

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
    this.routeSubscription = this.route.queryParamMap.subscribe(params => {
      const traceId = params.get('traceId') || '';
      this.searchText.set(traceId);
      this.visibleLogCount.set(this.logPageSize);

      this.store.setLogSearchValue(traceId);
      this.reloadLogsFromServer();
    });
    this.startRealtimeLogs();
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.journeyTraceSubscription?.unsubscribe();
    this.stopRealtimeLogs();
  }

  protected readonly displayedLogs = computed(() => {
    const timeFilteredLogs = this.filterLogsByTimeRange(this.store.filteredLogs());
    const logs = this.hideNoiseLogs()
      ? timeFilteredLogs.filter(log => !this.isNoiseLog(log))
      : timeFilteredLogs;

    const service = this.activeService();
    const serviceFilteredLogs = service === LogServiceCategory.ALL
      ? logs
      : logs.filter(log => this.normalizeServiceCategory(log.category) === service);

    return [...serviceFilteredLogs].sort((a, b) => this.compareLogListLogs(a, b));
  });

  protected readonly visibleLogs = computed(() => this.displayedLogs().slice(0, this.visibleLogCount()));

  protected isTraceIdSearch(): boolean {
    return this.normalizeTraceIdSearch(this.searchText()).length > 0;
  }

  private normalizeTraceIdSearch(value: string): string {
    return normalizeTraceIdInput(value);
  }

  protected formatLogClock(value: Date): string {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';

    return `${this.padTimePart(date.getHours())}:${this.padTimePart(date.getMinutes())}:${this.padTimePart(date.getSeconds())}.${this.padMilliseconds(date.getMilliseconds())}`;
  }

  protected formatLogDate(value: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(value));
  }

  protected relativeLogTime(value: Date): string {
    const diffMs = Date.now() - new Date(value).getTime();
    if (!Number.isFinite(diffMs)) return '';
    if (diffMs < 30_000) return 'now';
    if (diffMs < 60_000) return `${Math.floor(diffMs / 1000)}s ago`;
    if (diffMs < 60 * 60_000) return `${Math.floor(diffMs / 60_000)}m ago`;
    if (diffMs < 24 * 60 * 60_000) return `${Math.floor(diffMs / (60 * 60_000))}h ago`;
    return `${Math.floor(diffMs / (24 * 60 * 60_000))}d ago`;
  }

  protected timeGapFromPrevious(index: number): string {
    const logs = this.visibleLogs();
    if (index <= 0 || index >= logs.length) return '';

    const previousTime = new Date(logs[index - 1].timestamp).getTime();
    const currentTime = new Date(logs[index].timestamp).getTime();
    const diffMs = Math.abs(previousTime - currentTime);
    if (!Number.isFinite(diffMs) || diffMs < 1000) return '';

    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return `gap ${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const restSeconds = seconds % 60;
    return restSeconds > 0 ? `gap ${minutes}m ${restSeconds}s` : `gap ${minutes}m`;
  }

  protected toggleNoiseFilter(): void {
    this.hideNoiseLogs.update(value => !value);
    this.resetVisibleCounts();
  }

  private isNoiseLog(log: SystemLog): boolean {
    const text = ((log.message || '') + ' ' + (log.details || '')).toLowerCase();
    if (log.level !== LogLevel.ERROR && this.isInternalObservabilityLog(text)) return true;
    if (log.level === LogLevel.ERROR || this.getLogStatusCode(log) !== null || this.isRequestFlowBreadcrumb(log)) return false;
    return text.includes('application startup complete')
      || text.includes('waiting for application startup')
      || text.includes('started server process')
      || text.includes('started reloader process')
      || text.includes('uvicorn running on')
      || text.includes('spring.jpa.open-in-view')
      || text.includes('mysqldialect does not need');
  }

  private isInternalObservabilityLog(text: string): boolean {
    return text.includes('querying loki uri')
      || text.includes('request query logs received')
      || text.includes('/api/admin/logs')
      || text.includes('/loki/api/v1/query_range')
      || text.includes('/api/notifications/unread-count')
      || text.includes('/api/notifications');
  }
  private compareLogListLogs(left: SystemLog, right: SystemLog): number {
    const leftTime = new Date(left.timestamp).getTime();
    const rightTime = new Date(right.timestamp).getTime();
    const leftTimeValid = Number.isFinite(leftTime);
    const rightTimeValid = Number.isFinite(rightTime);

    if (this.isTraceIdSearch()) {
      const rankDelta = this.traceFlowSortRank(right) - this.traceFlowSortRank(left);
      if (rankDelta !== 0) return rankDelta;
    }

    if (leftTimeValid && rightTimeValid && leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return this.compareStableLogIdentity(left, right);
  }
  private isRequestFlowBreadcrumb(log: SystemLog): boolean {
    const message = `${log.message || ''} ${log.details || ''}`.toLowerCase();
    const category = this.normalizeServiceCategory(log.category);
    const context = this.parseClientLogStack(log.details);
    const eventType = (context?.eventType || '').toLowerCase();

    return eventType === 'fe_sent'
      || eventType === 'fe_received'
      || eventType === 'fe_failed'
      || eventType === 'httprequeststarted'
      || eventType === 'httprequestsucceeded'
      || eventType === 'httprequestfailed'
      || message.includes('[fe_sent]')
      || message.includes('[fe_received]')
      || message.includes('[fe_failed]')
      || message.includes('httprequeststarted')
      || message.includes('httprequestsucceeded')
      || message.includes('httprequestfailed')
      || (
        category === LogServiceCategory.BACKEND
        && (
          message.includes('incoming request')
          || message.includes('outgoing response')
          || message.includes('websocket chat message received')
          || message.includes('calling ai service')
          || message.includes('requesting ai reply stream')
          || this.isBackendProcessLog(message)
        )
      )
      || category === LogServiceCategory.AI_SERVICE;
  }
  private traceFlowSortRank(log: SystemLog): number {
    const rank = this.traceFlowRank(log);
    return rank >= 7 ? -1 : rank;
  }

  private compareStableLogIdentity(left: SystemLog, right: SystemLog): number {
    return `${right.id || ''}`.localeCompare(`${left.id || ''}`);
  }

  protected traceFlowLabel(log: SystemLog): string {
    const rank = this.traceFlowRank(log);
    if (rank === 0) return 'FE SENT';
    if (rank === 1) return 'BE IN';
    if (rank === 2) return 'BE PROCESS';
    if (rank === 3) return 'AI REQUEST';
    if (rank === 4) return 'AI RESPONSE';
    if (rank === 5) return this.isErrorLog(log) ? 'BE ERROR' : 'BE OUT';
    if (rank === 6) return this.isFailedFrontendLog(log) ? 'FE FAILED' : 'FE RECEIVED';
    return 'Related';
  }

  protected traceFlowRank(log: SystemLog): number {
    const message = `${log.message || ''} ${log.details || ''}`.toLowerCase();
    const category = this.normalizeServiceCategory(log.category);
    const context = this.parseClientLogStack(log.details);
    const eventType = (context?.eventType || '').toLowerCase();

    if (
      eventType === 'fe_sent'
      || eventType === 'httprequeststarted'
      || message.includes('[fe_sent]')
      || message.includes('httprequeststarted')
    ) return 0;
    if (category === LogServiceCategory.BACKEND && (message.includes('incoming request') || message.includes('websocket chat message received'))) return 1;
    if (
      category === LogServiceCategory.BACKEND
      && (message.includes('request to explain log received') || message.includes('request for follow-up chat received'))
    ) return 1;
    if (category === LogServiceCategory.BACKEND && (message.includes('calling ai service') || message.includes('requesting ai reply stream'))) return 3;
    if (category === LogServiceCategory.AI_SERVICE) return 4;
    if (
      category === LogServiceCategory.BACKEND
      && (message.includes('failed to explain log using ai') || message.includes('failed to call chat follow-up'))
    ) return 5;
    if (category === LogServiceCategory.BACKEND && message.includes('outgoing response')) return 5;
    if (category === LogServiceCategory.BACKEND && this.isBackendProcessLog(message)) return 2;
    if (
      eventType === 'fe_received'
      || eventType === 'fe_failed'
      || eventType === 'httprequestsucceeded'
      || eventType === 'httprequestfailed'
      || message.includes('[fe_received]')
      || message.includes('[fe_failed]')
      || message.includes('httprequestsucceeded')
      || message.includes('httprequestfailed')
    ) return 6;
    if (category === LogServiceCategory.BACKEND) return 2;
    if (category === LogServiceCategory.FRONTEND) return 7;
    return 7;
  }

  private isBackendProcessLog(message: string): boolean {
    return message.includes('business error')
      || message.includes('resolved')
      || message.includes('exception')
      || message.includes('globalexceptionhandler')
      || message.includes('validation')
      || message.includes('failed')
      || message.includes('error');
  }

  private isErrorLog(log: SystemLog): boolean {
    return `${log.level || ''}`.toUpperCase() === LogLevel.ERROR;
  }

  private isFailedFrontendLog(log: SystemLog): boolean {
    const message = `${log.message || ''} ${log.details || ''}`.toLowerCase();
    const context = this.parseClientLogStack(log.details);
    const eventType = (context?.eventType || '').toLowerCase();
    return eventType === 'fe_failed'
      || eventType === 'httprequestfailed'
      || message.includes('[fe_failed]')
      || message.includes('httprequestfailed');
  }

  protected handleFilterChange(filter: LogLevel | 'ALL'): void {
    this.activeFilter.set(filter);
    this.store.setLogFilterValue(filter);
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
      case LogTimeRange.TODAY:
        return 'Hôm nay';
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

    const cutoffTime = this.getRangeStartTime(this.activeTimeRange());

    return logs.filter(log => new Date(log.timestamp).getTime() >= cutoffTime);
  }

  private getTimeRangeMs(range: LogTimeRange): number {
    switch (range) {
      case LogTimeRange.TODAY:
        return this.startOfToday().getTime();
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

  private getRangeStartTime(range: LogTimeRange): number {
    if (range === LogTimeRange.TODAY) {
      return this.startOfToday().getTime();
    }

    return Date.now() - this.getTimeRangeMs(range);
  }

  private startOfToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
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
      startTime = this.getRangeStartTime(range);
      endTime = Date.now();
    }

    const search = this.searchText().trim();
    const traceId = this.normalizeTraceIdSearch(search);

    this.store.loadLogs({
      level: traceId ? 'ALL' : this.activeFilter(),
      search: traceId ? '' : search,
      traceId,
      startTime,
      endTime
    });
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
    this.store.setLogSearchValue(value);
    this.resetVisibleCounts();
    this.reloadLogsFromServer();
  }

  protected openLogDetails(log: SystemLog): void {
    this.selectedLog.set(log);
    this.loadTraceJourneyLogs(log);
  }

  protected closeLogDetails(): void {
    this.selectedLog.set(null);
  }

  protected loadMoreLogs(): void {
    this.visibleLogCount.update(count => count + this.logPageSize);
  }

  private resetVisibleCounts(): void {
    this.visibleLogCount.set(this.logPageSize);
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

  protected sendFollowUpChat(logItem: SystemLog): void {
    const logId = logItem.id;
    const userMsg = (this.chatInputs()[logId] || '').trim();
    if (!userMsg || this.sendingChatIds()[logId]) return;

    this.sendingChatIds.update(map => ({ ...map, [logId]: true }));
    const currentHistory = this.chatHistories()[logId] || [];
    const updatedHistory = [...currentHistory, { role: 'user' as const, content: userMsg }];
    this.chatHistories.update(map => ({ ...map, [logId]: updatedHistory }));
    this.chatInputs.update(map => ({ ...map, [logId]: '' }));

    this.store.chatFollowUp(
      logItem.category || LogServiceCategory.BACKEND,
      logItem.details || logItem.message,
      userMsg,
      currentHistory,
      (aiContent) => {
        const newHistory = [...updatedHistory, { role: 'assistant' as const, content: aiContent }];
        this.chatHistories.update(map => ({ ...map, [logId]: newHistory }));
        this.sendingChatIds.update(map => ({ ...map, [logId]: false }));
      },
      () => {
        this.sendingChatIds.update(map => ({ ...map, [logId]: false }));
      }
    );
  }

  protected updateChatInput(logId: string, value: string): void {
    this.chatInputs.update(map => ({ ...map, [logId]: value }));
  }

  protected filterByTraceId(traceId: string, event: Event): void {
    event.stopPropagation(); // Tránh kích hoạt toggle đóng mở dòng
    if (!traceId) return;
    this.searchText.set(traceId);
    this.activeFilter.set('ALL');
    this.activeService.set(LogServiceCategory.ALL);
    this.store.setLogFilterValue('ALL');
    this.store.setLogSearchValue(traceId);
    this.reloadLogsFromServer();
  }

  protected applyLevelFilter(level: LogLevel, event: Event): void {
    event.stopPropagation();
    this.handleFilterChange(level);
  }

  protected applyServiceFilter(category: string, event: Event): void {
    event.stopPropagation();
    this.handleServiceChange(this.normalizeServiceCategory(category));
  }

  protected getLogDetailTitle(log: SystemLog): string {
    const stackContext = this.parseClientLogStack(log.details);
    const targetEmail = (stackContext?.userEmail || '').trim();

    switch (stackContext?.eventType) {
      case 'AuthLoginFailed':
        return targetEmail
          ? 'Đăng nhập thất bại: ' + targetEmail
          : 'Đăng nhập thất bại bằng Email';
      case 'AuthLoginSucceeded':
        return targetEmail
          ? 'Đăng nhập thành công: ' + targetEmail
          : 'Đăng nhập thành công';
      default:
        return this.toFriendlyJourneyTitle(stackContext?.eventType, this.extractLogMessageSummary(log));
    }
  }

  private extractLogMessageSummary(log: SystemLog): string {
    const raw = (log.message || log.details || '').trim();
    if (!raw) return 'Log detail';

    const messageMatch = raw.match(/Msg:\s*(.*?)(?:\s+\|\s+URL:|\s+\|\s+Stack:|$)/);
    const summary = (messageMatch?.[1] || raw.split('|')[0] || raw).trim();
    return summary.length > 140 ? summary.slice(0, 137).trimEnd() + '...' : summary;
  }

  protected getLogStatusCode(log: SystemLog): number | null {
    if (typeof log.statusCode === 'number') {
      return log.statusCode;
    }

    const stackStatus = this.parseClientLogStack(log.details)?.statusCode;
    if (typeof stackStatus === 'number') {
      return stackStatus;
    }

    const raw = log.details || log.message || '';
    const patterns = [
      /\"(?:statusCode|status_code|status)\"\s*:\s*(\d{3})/,
      /\b(?:Business error|Validation error|Argument type mismatch|Access denied|Unexpected server error) \((\d{3})\)/,
      /\b(?:Outgoing Response|Response):\s*(\d{3})\b/,
      /\b(?:FE_FAILED|HttpRequestFailed)[^\r\n]*\b(\d{3})\b/,
    ];

    for (const pattern of patterns) {
      const match = raw.match(pattern);
      const statusCode = match?.[1] ? Number(match[1]) : NaN;
      if (Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599) {
        return statusCode;
      }
    }

    return null;
  }

  protected getLogClassification(log: SystemLog): LogClassification {
    const text = ((log.message || '') + ' ' + (log.details || '')).toLowerCase();
    const statusCode = this.getLogStatusCode(log);
    const category = this.normalizeServiceCategory(log.category);

    if (category === LogServiceCategory.AI_SERVICE || text.includes('ai service')) {
      return { label: 'AI Service', tone: 'ai' };
    }
    if (text.includes('/auth/') || text.includes('auth') || text.includes('đăng nhập') || text.includes('dang nhap')) {
      return { label: 'Auth flow', tone: 'auth' };
    }
    if (statusCode !== null && statusCode >= 500) {
      return { label: 'System 5xx', tone: 'system' };
    }
    if (statusCode !== null && statusCode >= 400) {
      return { label: 'Business 4xx', tone: 'business' };
    }
    if (text.includes('timeout') || text.includes('connection') || text.includes('network')) {
      return { label: 'Network', tone: 'network' };
    }
    if (category === LogServiceCategory.FRONTEND) {
      return { label: 'Client UI', tone: 'client' };
    }
    return { label: 'System signal', tone: 'normal' };
  }

  protected getFlowSummary(log: SystemLog): LogFlowSummary {
    const statusCode = this.getLogStatusCode(log);
    const context = this.parseClientLogStack(log.details);
    const category = this.normalizeServiceCategory(log.category);
    const journey = this.getUserJourney(log);
    const hasFrontend = journey.some(item => this.normalizeServiceCategory(item.category) === LogServiceCategory.FRONTEND) || category === LogServiceCategory.FRONTEND;
    const hasBackend = journey.some(item => this.normalizeServiceCategory(item.category) === LogServiceCategory.BACKEND) || category === LogServiceCategory.BACKEND;
    const hasAi = journey.some(item => this.normalizeServiceCategory(item.category) === LogServiceCategory.AI_SERVICE) || category === LogServiceCategory.AI_SERVICE;
    const flow = [hasFrontend ? 'Frontend' : '', hasBackend ? 'Backend' : '', hasAi ? 'AI' : ''].filter(Boolean).join(' -> ') || category;
    const result = statusCode !== null
      ? (statusCode >= 500 ? 'Thất bại hệ thống HTTP ' + statusCode : statusCode >= 400 ? 'Thất bại nghiệp vụ HTTP ' + statusCode : 'Hoàn tất HTTP ' + statusCode)
      : (log.level === LogLevel.ERROR ? 'Lỗi hệ thống' : log.level === LogLevel.WARN ? 'Cảnh báo cần theo dõi' : 'Hoạt động bình thường');
    const duration = context?.durationMs !== undefined && context.durationMs !== null
      ? context.durationMs + 'ms'
      : this.extractDurationMs(log) || 'N/A';
    const api = this.resolveLogApiPath(log) || 'N/A';

    return { flow, result, duration, api };
  }

  private extractDurationMs(log: SystemLog): string {
    const raw = log.details || log.message || '';
    const match = raw.match(/(\d+)ms/i);
    return match?.[1] ? match[1] + 'ms' : '';
  }

  protected resolveLogApiPath(log: SystemLog): string {
    const context = this.parseClientLogStack(log.details);
    if (context?.apiPath) return context.apiPath;

    const relatedApi = this.findRelatedApiPath(log);
    if (relatedApi) return relatedApi;

    return this.extractApiPathFromText(log.details || log.message || '');
  }

  private findRelatedApiPath(log: SystemLog): string {
    const traceId = this.recordingTraceIdForLog(log);
    if (!traceId) return '';

    const loadedTraceLogs = this.journeyTraceLogs()[traceId] || [];
    const candidates = this.uniqueJourneyLogs([...loadedTraceLogs, ...this.store.logs()]);
    for (const candidate of candidates) {
      if (candidate.id === log.id) continue;
      if (this.recordingTraceIdForLog(candidate) !== traceId) continue;

      const context = this.parseClientLogStack(candidate.details);
      if (context?.apiPath) return context.apiPath;

      const apiPath = this.extractApiPathFromText(candidate.details || candidate.message || '');
      if (apiPath) return apiPath;
    }

    return '';
  }

  private extractApiPathFromText(text: string): string {
    const match = text.match(/\b(?:GET|POST|PUT|PATCH|DELETE)\s+((?:https?:\/\/[^\s|]+)|(?:\/api\/[^\s|]+))/i);
    return match?.[1] || '';
  }

  private extractHttpMethodFromText(text: string): string {
    const match = text.match(/\b(GET|POST|PUT|PATCH|DELETE)\b/i);
    return match?.[1]?.toUpperCase() || '';
  }

  protected getJourneyIcon(logOrJourney: SystemLog | LogJourneyItem): 'frontend' | 'backend' | 'ai' {
    const category = this.normalizeServiceCategory(logOrJourney.category);
    if (category === LogServiceCategory.FRONTEND) return 'frontend';
    if (category === LogServiceCategory.AI_SERVICE) return 'ai';
    return 'backend';
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

    const statusCode = this.getLogStatusCode(log);
    if (statusCode !== null) {
      metadata.push({ label: 'status_code', value: String(statusCode) });
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
      { label: 'filename', value: filename },
    ];
  }

  protected getUserJourney(log: SystemLog): LogJourneyItem[] {
    if (!this.hasRequestTrace(log)) {
      return [];
    }

    const currentContext = this.parseClientLogStack(log.details);
    const currentTime = new Date(log.timestamp).getTime();
    const journeyWindowMs = 10 * 60 * 1000;
    const traceId = this.recordingTraceIdForLog(log);
    const loadedTraceLogs = traceId ? this.journeyTraceLogs()[traceId] || [] : [];

    return this.uniqueJourneyLogs([...this.store.logs(), ...loadedTraceLogs])
      .filter(candidate => candidate.id === log.id || !this.hideNoiseLogs() || !this.isNoiseLog(candidate))
      .filter(candidate => this.isJourneyCandidate(candidate, log, currentContext, currentTime, journeyWindowMs))
      .sort((left, right) => this.compareJourneyLogs(left, right))
      .slice(0, 50)
      .map((candidate, index, journeyLogs) => this.toJourneyItem(
        candidate,
        log.id,
        index + 1,
        index > 0 ? new Date(journeyLogs[index - 1].timestamp).getTime() : null
      ));
  }

  private loadTraceJourneyLogs(log: SystemLog): void {
    const traceId = this.recordingTraceIdForLog(log);
    if (!traceId || this.journeyTraceLogs()[traceId]) return;

    const logTime = new Date(log.timestamp).getTime();
    if (!Number.isFinite(logTime)) return;

    const startTime = logTime - 10 * 60 * 1000;
    const endTime = logTime + 2 * 60 * 1000;

    this.journeyTraceSubscription?.unsubscribe();
    this.journeyTraceSubscription = this.adminLogsService
      .getLogs('ALL', '', traceId, 200, startTime, endTime, true)
      .subscribe({
        next: logs => {
          this.journeyTraceLogs.update(map => ({ ...map, [traceId]: logs }));
        },
        error: error => {
          console.warn('[Logs] Failed to load trace journey logs', error);
          this.journeyTraceLogs.update(map => ({ ...map, [traceId]: [] }));
        },
      });
  }

  private uniqueJourneyLogs(logs: SystemLog[]): SystemLog[] {
    const seen = new Set<string>();

    return logs.filter(log => {
      const key = this.journeyDedupeKey(log);
      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }

  private journeyDedupeKey(log: SystemLog): string {
    const context = this.parseClientLogStack(log.details);
    const traceId = this.recordingTraceIdForLog(log);
    const eventType = context?.eventType || '';
    const method = context?.method || this.extractHttpMethodFromText(log.details || log.message || '');
    const apiPath = context?.apiPath || this.extractApiPathFromText(log.details || log.message || '');
    const statusCode = this.getLogStatusCode(log) ?? '';
    const summary = this.extractLogMessageSummary(log).toLowerCase().replace(/\s+/g, ' ').trim();

    return [traceId, log.category, log.level, eventType, method, apiPath, statusCode, summary].join('|');
  }

  private compareJourneyLogs(left: SystemLog, right: SystemLog): number {
    const leftTime = new Date(left.timestamp).getTime();
    const rightTime = new Date(right.timestamp).getTime();

    if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
      return this.traceFlowRank(left) - this.traceFlowRank(right);
    }

    const sameFlowMoment = Math.abs(leftTime - rightTime) <= 1000;
    if (sameFlowMoment) {
      const rankDelta = this.traceFlowRank(left) - this.traceFlowRank(right);
      if (rankDelta !== 0) return rankDelta;
    }

    return leftTime - rightTime;
  }

  private isJourneyCandidate(
    candidate: SystemLog,
    currentLog: SystemLog,
    currentContext: ClientLogStackContext | null,
    currentTime: number,
    journeyWindowMs: number
  ): boolean {
    const candidateTime = new Date(candidate.timestamp).getTime();

    const futureGraceMs = 2 * 1000;
    if (candidateTime > currentTime + futureGraceMs || currentTime - candidateTime > journeyWindowMs) {
      return false;
    }

    if (candidate.id === currentLog.id) {
      return true;
    }

    // 1. Nếu trùng traceId (ở cả header hoặc client context), chắc chắn thuộc hành trình
    const candidateContext = this.parseClientLogStack(candidate.details);
    const candidateTraceId = candidate.traceId || candidateContext?.traceId;
    const currentTraceId = currentLog.traceId || currentContext?.traceId;

    if (candidateTraceId && currentTraceId && candidateTraceId === currentTraceId) {
      return true;
    }

    // 2. Loại bỏ các log API có traceId của request khác (tránh chồng chéo các API calls song song)
    if (candidateTraceId && currentTraceId && candidateTraceId !== currentTraceId) {
      return false;
    }

    // 3. Với các sự kiện điều hướng trang không có traceId, lọc theo email người dùng để chắc chắn cùng một phiên làm việc
    if (currentContext?.userEmail && candidateContext?.userEmail && candidateContext.userEmail !== currentContext.userEmail) {
      return false;
    }

    // 4. Lấy các log Frontend trong cùng một route làm breadcrumbs
    if (this.normalizeServiceCategory(candidate.category) === LogServiceCategory.FRONTEND) {
      if (currentContext?.routeUrl && candidateContext?.routeUrl && candidateContext.routeUrl !== currentContext.routeUrl) {
        return false;
      }
      return true;
    }

    return false;
  }

  private toJourneyItem(log: SystemLog, currentLogId: string, step: number, previousTime: number | null): LogJourneyItem {
    const context = this.parseClientLogStack(log.details);
    const title = this.toFriendlyJourneyTitle(context?.eventType, log.message);
    const routeText = context?.routeUrl ? `Route: ${context.routeUrl}` : '';
    const apiText = context?.apiPath ? `API: ${context.method || 'HTTP'} ${this.normalizeApiPath(context.apiPath)}` : '';
    const reasonText = context?.reason ? `Reason: ${context.reason}` : '';
    const description = [routeText, apiText, reasonText].filter(Boolean).join(' - ') || log.message;
    const time = new Date(log.timestamp);

    return {
      id: log.id,
      time,
      title,
      description,
      level: log.level,
      category: log.category,
      isCurrent: log.id === currentLogId,
      step,
      timeLabel: this.formatJourneyTime(time),
      deltaLabel: this.formatJourneyDelta(time.getTime(), previousTime),
      flowLabel: this.traceFlowLabel(log),
    };
  }

  private formatJourneyTime(value: Date): string {
    const time = value.getTime();
    if (!Number.isFinite(time)) return '';

    const base = new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(value);

    return `${base}.${String(value.getMilliseconds()).padStart(3, '0')}`;
  }

  private formatJourneyDelta(time: number, previousTime: number | null): string {
    if (!Number.isFinite(time) || previousTime === null || !Number.isFinite(previousTime)) return '';

    const deltaMs = Math.max(0, Math.round(time - previousTime));
    if (deltaMs < 1000) return `+${deltaMs}ms`;

    const seconds = deltaMs / 1000;
    return `+${seconds.toFixed(seconds >= 10 ? 1 : 2)}s`;
  }

  private toFriendlyJourneyTitle(eventType: string | undefined, fallbackMessage: string): string {
    switch (eventType) {
      case 'FE_SENT':
        return 'Gửi API';
      case 'FE_RECEIVED':
      case 'HttpRequestSucceeded':
        return 'Gọi API thành công';
      case 'FE_FAILED':
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

  protected formatLogDateTime(value: Date): string {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';

    const day = this.padTimePart(date.getDate());
    const month = this.padTimePart(date.getMonth() + 1);
    const year = date.getFullYear();

    return `${this.formatLogClock(date)} ${day}/${month}/${year}`;
  }

  private padTimePart(value: number): string {
    return String(value).padStart(2, '0');
  }

  private padMilliseconds(value: number): string {
    return String(value).padStart(3, '0');
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

  protected recordingEmailForLog(log: SystemLog): string {
    const stackContext = this.parseClientLogStack(log.details);
    return this.resolveRecordingEmail(stackContext?.userEmail || (log as any).userEmail || '')
      || this.findCorrelatedRecordingEmail(log);
  }

  protected recordingTraceIdForLog(log: SystemLog): string {
    const stackContext = this.parseClientLogStack(log.details);
    const traceId = (stackContext?.traceId || log.traceId || '').trim();
    return traceId.toUpperCase() === 'ZT-AI-SYSTEM' ? '' : traceId;
  }

  protected hasRequestTrace(log: SystemLog): boolean {
    return this.recordingTraceIdForLog(log).length > 0;
  }

  protected recordingUserIdForLog(log: SystemLog): string {
    const stackContext = this.parseClientLogStack(log.details);
    return (stackContext?.userId || (log as any).userId || this.findCorrelatedRecordingUserId(log) || '').trim();
  }

  private findCorrelatedRecordingUserId(log: SystemLog): string {
    const traceId = this.recordingTraceIdForLog(log);
    if (!traceId) return '';

    const loadedTraceLogs = this.journeyTraceLogs()[traceId] || [];

    return this.uniqueJourneyLogs([...this.store.logs(), ...loadedTraceLogs])
      .map(candidate => {
        if (candidate.id === log.id || this.recordingTraceIdForLog(candidate) !== traceId) return '';
        const context = this.parseClientLogStack(candidate.details);
        return (context?.userId || (candidate as any).userId || '').trim();
      })
      .find(Boolean) || '';
  }

  private findCorrelatedRecordingEmail(log: SystemLog): string {
    const traceId = this.recordingTraceIdForLog(log);
    if (!traceId) return '';

    const logTime = new Date(log.timestamp).getTime();
    if (!Number.isFinite(logTime)) return '';

    const correlationWindowMs = 10 * 60 * 1000;
    return this.store.logs()
      .map(candidate => {
        const candidateTraceId = this.recordingTraceIdForLog(candidate);
        if (candidate.id === log.id || candidateTraceId !== traceId) return null;

        const candidateEmail = this.resolveRecordingEmail(this.rawRecordingEmail(candidate));
        if (!candidateEmail) return null;

        const candidateTime = new Date(candidate.timestamp).getTime();
        if (!Number.isFinite(candidateTime)) return null;

        const distanceMs = Math.abs(candidateTime - logTime);
        if (distanceMs > correlationWindowMs) return null;

        return { email: candidateEmail, distanceMs };
      })
      .filter((item): item is { email: string; distanceMs: number } => !!item)
      .sort((a, b) => a.distanceMs - b.distanceMs)[0]?.email || '';
  }

  private rawRecordingEmail(log: SystemLog): string {
    const stackContext = this.parseClientLogStack(log.details);
    return stackContext?.userEmail || (log as any).userEmail || '';
  }
  private resolveRecordingEmail(email: string): string {
    const candidate = (email || '').trim();
    if (!candidate.includes('*')) return candidate;

    const currentEmail = this.authStorageService.getSession()?.email || '';
    if (currentEmail && this.maskEmailForComparison(currentEmail).toLowerCase() === candidate.toLowerCase()) {
      return currentEmail;
    }
    return candidate;
  }

  private maskEmailForComparison(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return email;
    if (localPart.length <= 2) return localPart.charAt(0) + '*@' + domain;
    return localPart.charAt(0) + '*'.repeat(localPart.length - 2) + localPart.charAt(localPart.length - 1) + '@' + domain;
  }

  protected copyToClipboard(text: string, event: Event): void {
    event.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      this.toastService.success('Đã sao chép nội dung log!');
    });
  }

  protected handleRefreshLogs(): void {
    this.reloadLogsFromServer();
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
    this.wsService.connect();
    
    // Subscribe to websocket log topic
    this.wsSubscription = this.wsService.subscribe<SystemLog>('/topic/admin.logs')
      .subscribe({
        next: (logItem: SystemLog) => {
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

}

