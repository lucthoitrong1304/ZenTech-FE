import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, inject, signal, computed, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MarkdownComponent } from 'ngx-markdown';
import {
  LucideSearch,
  LucideTrash2,
  LucideChevronDown,
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
import { ActivityArea, ActivitySeverity, LogLevel, LogServiceCategory, SystemLog } from '../../../data-access/models/admin.models';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { WebsocketService } from '../../../../../core/services/websocket.service';
import { AuthStorageService } from '../../../../../core/services/auth-storage.service';
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
    LucideChevronDown,
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
  protected readonly LogLevel = LogLevel;
  protected readonly LogServiceCategory = LogServiceCategory;

  protected readonly LogTimeRange = LogTimeRange;

  protected readonly activeFilter = signal<LogLevel | 'ALL'>('ALL');
  protected readonly activeService = signal<LogServiceCategory>(LogServiceCategory.ALL); // Lọc theo SERVICE nguồn
  protected readonly searchText = signal('');
  protected readonly selectedLog = signal<SystemLog | null>(null);
  protected readonly activeTimeRange = signal<LogTimeRange>(LogTimeRange.TODAY);
  protected readonly autoRefreshEnabled = signal(true);
  protected readonly visibleLogCount = signal(50);
  protected readonly logPageSize = 50;
  protected readonly wsService = inject(WebsocketService);
  private readonly ngZone = inject(NgZone);
  private readonly route = inject(ActivatedRoute);
  private wsSubscription: Subscription | null = null;

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
    const traceId = this.route.snapshot.queryParamMap.get('traceId') || '';
    this.searchText.set(traceId);
    if (traceId) {
      this.store.loadLogs({ level: 'ALL', search: traceId, traceId });
    } else {
      this.reloadLogsFromServer();
    }
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

  protected readonly visibleLogs = computed(() => this.displayedLogs().slice(0, this.visibleLogCount()));

  protected handleFilterChange(filter: LogLevel | 'ALL'): void {
    this.activeFilter.set(filter);
    this.store.setLogFilter(filter);
    this.resetVisibleCounts();
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
    const isTraceId = search.startsWith('ZT-') && search.length > 5;

    this.store.loadLogs({
      level: this.activeFilter(),
      search: isTraceId ? '' : search,
      traceId: isTraceId ? search : '',
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
    this.store.setLogSearch(value);
    this.resetVisibleCounts();
    this.reloadLogsFromServer();
  }

  protected openLogDetails(log: SystemLog): void {
    this.selectedLog.set(log);
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
    this.store.setLogSearch(traceId);
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
    return (stackContext?.traceId || log.traceId || '').trim();
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
    return currentEmail && this.maskEmailForComparison(currentEmail).toLowerCase() === candidate.toLowerCase()
      ? currentEmail
      : '';
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

}

