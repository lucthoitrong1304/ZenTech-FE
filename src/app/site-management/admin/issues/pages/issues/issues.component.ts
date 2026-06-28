import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, inject, signal, computed, effect, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
import { ActivityArea, ActivitySeverity, IncidentCreationSource, IncidentSeverity, IssueIncidentLink, LogLevel, LogServiceCategory, SystemIncident, SystemLog } from '../../../data-access/models/admin.models';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { WebsocketService } from '../../../../../core/services/websocket.service';
import { AdminIncidentsService } from '../../../incidents/data-access/services/admin-incidents.service';

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

enum IssueStatusFilter {
  ALL = 'ALL',
  WATCHING = 'WATCHING',
  LINKED = 'LINKED',
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
  apiPath?: string;
  httpMethod?: string;
  statusCode?: number;
  errorMessage?: string;
  userEmail?: string | null;
  userRole?: string | null;
  latestContext?: ClientLogStackContext | null;
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
  private readonly router = inject(Router);
  private readonly adminIncidentsService = inject(AdminIncidentsService);
  protected readonly LogLevel = LogLevel;
  protected readonly LogServiceCategory = LogServiceCategory;
  protected readonly LogTimeRange = LogTimeRange;
  protected readonly IssueStatusFilter = IssueStatusFilter;
  protected readonly IncidentSeverity = IncidentSeverity;
  protected readonly IncidentCreationSource = IncidentCreationSource;

  protected readonly activeFilter = signal<LogLevel | 'ALL'>('ALL');
  protected readonly activeService = signal<LogServiceCategory>(LogServiceCategory.ALL);
  protected readonly activeIssueStatus = signal<IssueStatusFilter>(IssueStatusFilter.ALL);
  protected readonly searchText = signal('');
  protected readonly selectedLog = signal<SystemLog | null>(null);
  protected readonly selectedIssue = signal<LogIssue | null>(null);
  protected readonly selectedIssueReturn = signal<LogIssue | null>(null);
  protected readonly expandedRelatedIssueSignatures = signal<Record<string, boolean>>({});
  protected readonly issueLinks = signal<Record<string, IssueIncidentLink>>({});
  protected readonly showCreateIncidentDialog = signal(false);
  protected readonly incidentSeverity = signal<IncidentSeverity>(IncidentSeverity.MEDIUM);
  protected readonly isCreatingIncident = signal(false);
  protected readonly activeTimeRange = signal<LogTimeRange>(LogTimeRange.HOUR_1);
  protected readonly autoRefreshEnabled = signal(true);
  protected readonly visibleIssueCount = signal(20);
  protected readonly issuePageSize = 20;
  protected readonly wsService = inject(WebsocketService);
  private readonly ngZone = inject(NgZone);
  private wsSubscription: Subscription | null = null;
  private issueLinksRefreshTimer: number | null = null;
  private lastIssueLinksLookupKey = '';
  private readonly issueLinksRefreshVersion = signal(0);
  private pendingLinkedIssueSignature: string | null = null;

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
    const params = this.route.snapshot.queryParamMap;
    const search = params.get('search')?.trim() ?? '';
    const service = params.get('service') as LogServiceCategory | null;
    const range = params.get('range') as LogTimeRange | null;
    const issueStatus = params.get('issueStatus') as IssueStatusFilter | null;
    const issueSignature = params.get('issueSignature')?.trim() ?? '';

    if (search) {
      this.searchText.set(search);
      this.store.setLogSearch(search);
    }
    if (service && Object.values(LogServiceCategory).includes(service)) {
      this.activeService.set(service);
    }
    if (range && Object.values(LogTimeRange).includes(range)) {
      this.activeTimeRange.set(range);
      if (range === LogTimeRange.CUSTOM) {
        const startTime = Number(params.get('startTime'));
        const endTime = Number(params.get('endTime'));
        if (Number.isFinite(startTime) && Number.isFinite(endTime)) {
          this.customStartTime.set(new Date(startTime));
          this.customEndTime.set(new Date(endTime));
          this.autoRefreshEnabled.set(false);
        }
      }
    }
    if (issueStatus && Object.values(IssueStatusFilter).includes(issueStatus)) {
      this.activeIssueStatus.set(issueStatus);
    }
    if (issueSignature) {
      this.pendingLinkedIssueSignature = issueSignature;
    }

    this.reloadLogsFromServer();
    this.startRealtimeLogs();
  }

  ngOnDestroy(): void {
    this.stopRealtimeLogs();
    if (this.issueLinksRefreshTimer !== null) {
      window.clearTimeout(this.issueLinksRefreshTimer);
      this.issueLinksRefreshTimer = null;
    }
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
            if (this.shouldRefreshIssueLinksForLog(logItem)) {
              this.requestIssueLinksRefresh();
            }
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

  protected readonly baseIssues = computed(() => {
    const filter = this.activeFilter();
    const issueLogs = this.filterLogsByTimeRange(this.store.filteredIssueLogs())
      .filter(log => filter === 'ALL' || log.level === filter);
    const service = this.activeService();
    const scopedIssueLogs = service === LogServiceCategory.ALL
      ? issueLogs
      : issueLogs.filter(log => this.normalizeServiceCategory(log.category) === service);

    return this.buildIssues(scopedIssueLogs);
  });

  protected readonly displayedIssues = computed(() => this.filterIssuesByStatus(this.baseIssues()));

  protected readonly visibleIssues = computed(() => this.displayedIssues().slice(0, this.visibleIssueCount()));

  private readonly issueLinksRefreshEffect = effect(() => {
    this.issueLinksRefreshVersion();
    this.baseIssues().map(issue => issue.signature).join('||');
    this.scheduleIssueLinksRefresh(true);
  });

  private filterIssuesByStatus(issues: LogIssue[]): LogIssue[] {
    const status = this.activeIssueStatus();
    if (status === IssueStatusFilter.ALL) {
      return issues;
    }

    return issues.filter(issue => {
      const hasIncident = !!this.getIssueLink(issue);
      return status === IssueStatusFilter.LINKED ? hasIncident : !hasIncident;
    });
  }
  protected getIssueLink(issue: LogIssue): IssueIncidentLink | null {
    return this.issueLinks()[issue.signature] ?? null;
  }

  protected handleFilterChange(filter: LogLevel | 'ALL'): void {
    this.activeFilter.set(filter);
    this.resetVisibleCounts();
    this.reloadLogsFromServer();
  }

  protected handleServiceChange(service: LogServiceCategory): void {
    this.activeService.set(service);
    this.resetVisibleCounts();
  }

  protected handleIssueStatusChange(status: IssueStatusFilter): void {
    this.activeIssueStatus.set(status);
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
      endTime,
      skipGlobalError: true
    });

    this.store.loadIssueLogs({
      search: isTraceId ? '' : search,
      traceId: isTraceId ? search : '',
      startTime,
      endTime,
      skipGlobalError: true
    });

    this.requestIssueLinksRefresh();
  }

  private shouldRefreshIssueLinksForLog(log: SystemLog): boolean {
    if (log.level !== LogLevel.WARN && log.level !== LogLevel.ERROR) {
      return false;
    }

    return !this.isInternalObservabilityLog(log);
  }

  private isInternalObservabilityLog(log: SystemLog): boolean {
    const text = `${log.message || ''} ${log.details || ''}`.toLowerCase();
    return [
      '/api/admin/incidents/issue-links',
      '/admin/incidents/issue-links',
      '/api/admin/logs',
      '/admin/logs',
      '/api/admin/activity-logs',
      '/admin/activity-logs',
      '/topic/admin.logs'
    ].some(fragment => text.includes(fragment));
  }
  private requestIssueLinksRefresh(): void {
    this.issueLinksRefreshVersion.update(version => version + 1);
  }

  private scheduleIssueLinksRefresh(force = false): void {
    if (this.issueLinksRefreshTimer !== null) {
      window.clearTimeout(this.issueLinksRefreshTimer);
    }

    this.issueLinksRefreshTimer = window.setTimeout(() => {
      this.issueLinksRefreshTimer = null;
      this.refreshIssueLinks(force);
    }, 250);
  }

  private refreshIssueLinks(force = false): void {
    const signatures = this.baseIssues()
      .map(issue => issue.signature)
      .filter((signature, index, all) => !!signature && all.indexOf(signature) === index)
      .sort();

    if (!signatures.length) {
      this.issueLinks.set({});
      this.lastIssueLinksLookupKey = '';
      return;
    }

    const lookupKey = signatures.join('||');
    if (!force && lookupKey === this.lastIssueLinksLookupKey) {
      return;
    }
    this.lastIssueLinksLookupKey = lookupKey;

    this.adminIncidentsService.getIssueLinks(signatures).subscribe({
      next: (res) => {
        this.issueLinks.set(res.data ?? {});
        this.openPendingLinkedIssue();
      },
      error: (err) => console.error('Failed to load issue incident links', err)
    });
  }

  private openPendingLinkedIssue(): void {
    const signature = this.pendingLinkedIssueSignature;
    if (!signature) {
      return;
    }

    const issue = this.baseIssues().find(item => item.signature === signature);
    if (!issue) {
      return;
    }

    const displayedIndex = this.displayedIssues().findIndex(item => item.signature === signature);
    if (displayedIndex >= this.visibleIssueCount()) {
      this.visibleIssueCount.set(displayedIndex + 1);
    }

    this.selectedIssue.set(issue);
    this.pendingLinkedIssueSignature = null;
  }
  protected openCreateIncidentDialog(issue: LogIssue): void {
    if (this.getIssueLink(issue)) {
      return;
    }
    this.selectedIssue.set(issue);
    this.incidentSeverity.set(this.inferDefaultSeverity(issue));
    this.showCreateIncidentDialog.set(true);
  }

  protected closeCreateIncidentDialog(): void {
    if (this.isCreatingIncident()) {
      return;
    }
    this.showCreateIncidentDialog.set(false);
  }

  protected setIncidentSeverity(severity: IncidentSeverity): void {
    this.incidentSeverity.set(severity);
  }

  protected createIncidentFromSelectedIssue(): void {
    const issue = this.selectedIssue();
    if (!issue || this.getIssueLink(issue)) {
      return;
    }

    this.isCreatingIncident.set(true);
    const latestLog = this.getLatestLog(issue);
    const fallbackHttp = latestLog ? this.extractHttpMetadataFromText(`${latestLog.message}\n${latestLog.details || ''}`) : {};
    this.adminIncidentsService.createIncidentFromIssue({
      issueSignature: issue.signature,
      title: issue.title,
      serviceName: this.normalizeServiceCategory(issue.category),
      apiPath: issue.apiPath || fallbackHttp.apiPath,
      httpMethod: issue.httpMethod || fallbackHttp.httpMethod,
      statusCode: issue.statusCode ?? fallbackHttp.statusCode,
      errorMessage: issue.errorMessage || issue.title,
      traceId: latestLog?.traceId || issue.traceIds[0],
      stackTrace: latestLog?.details || latestLog?.message,
      occurredAt: issue.firstSeen.toISOString(),
      severity: this.incidentSeverity()
    }).subscribe({
      next: (res) => {
        this.isCreatingIncident.set(false);
        this.showCreateIncidentDialog.set(false);
        this.toastService.success(`Đã tạo Incident ${res.data.code} từ Issue`);
        this.issueLinks.update(links => ({
          ...links,
          [issue.signature]: {
            incidentId: res.data.id,
            incidentCode: res.data.code,
            creationSource: res.data.creationSource ?? IncidentCreationSource.MANUAL,
            status: res.data.status
          }
        }));
        this.refreshIssueLinks(true);
      },
      error: (err) => {
        this.isCreatingIncident.set(false);
        const existing = err?.error?.data as SystemIncident | undefined;
        if (existing?.id && existing.code) {
          this.issueLinks.update(links => ({
            ...links,
            [issue.signature]: {
              incidentId: existing.id,
              incidentCode: existing.code,
              creationSource: existing.creationSource ?? IncidentCreationSource.MANUAL,
              status: existing.status
            }
          }));
          this.showCreateIncidentDialog.set(false);
          this.toastService.warning(`Issue đã có Incident ${existing.code}`);
          return;
        }
        console.error(err);
        this.toastService.error('Không thể tạo Incident từ Issue');
      }
    });
  }

  protected openLinkedIncident(link: IssueIncidentLink, event?: Event): void {
    event?.stopPropagation();
    this.router.navigate(['/admin/incidents', link.incidentId]);
  }

  protected getIssueBadgeLabel(issue: LogIssue): string {
    const link = this.getIssueLink(issue);
    if (!link) {
      return 'Theo dõi';
    }
    return link.creationSource === IncidentCreationSource.AUTO ? 'Đã tự động tạo Incident' : 'Đã tạo thủ công';
  }

  protected getIssueBadgeClass(issue: LogIssue): string {
    const link = this.getIssueLink(issue);
    if (!link) {
      return 'logs-issue-status-badge--watching';
    }
    return link.creationSource === IncidentCreationSource.AUTO
      ? 'logs-issue-status-badge--auto'
      : 'logs-issue-status-badge--manual';
  }

  protected getLatestLog(issue: LogIssue): SystemLog | undefined {
    return [...issue.logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  }

  protected getRelatedLogs(issue: LogIssue): SystemLog[] {
    const sortedLogs = [...issue.logs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return this.isRelatedLogsExpanded(issue) ? sortedLogs : sortedLogs.slice(0, 5);
  }

  protected isRelatedLogsExpanded(issue: LogIssue): boolean {
    return !!this.expandedRelatedIssueSignatures()[issue.signature];
  }

  protected shouldShowRelatedLogsToggle(issue: LogIssue): boolean {
    return issue.logs.length > 5;
  }

  protected toggleRelatedLogs(issue: LogIssue, event: Event): void {
    event.stopPropagation();
    this.expandedRelatedIssueSignatures.update(map => ({
      ...map,
      [issue.signature]: !map[issue.signature]
    }));
  }

  private inferDefaultSeverity(issue: LogIssue): IncidentSeverity {
    if ((issue.statusCode ?? 0) >= 500 || issue.level === LogLevel.ERROR) {
      return IncidentSeverity.HIGH;
    }
    return IncidentSeverity.MEDIUM;
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

    const traceId = this.getEffectiveTraceId(log, stackContext);

    if (traceId) {
      metadata.push({ label: 'trace_id', value: traceId });
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

        const context = this.parseClientLogStack(log.details);
        const traceId = this.getEffectiveTraceId(log, context);
        const textMetadata = this.extractHttpMetadataFromText(`${log.message}\n${log.details || ''}`);
        const metadata = {
          apiPath: context?.apiPath ? this.normalizeApiPath(context.apiPath) : textMetadata.apiPath,
          httpMethod: context?.method || textMetadata.httpMethod,
          statusCode: context?.statusCode ?? textMetadata.statusCode,
          errorMessage: context?.reason ? this.sanitizeVisibleLogText(context.reason) : this.sanitizeVisibleLogText(log.message.split('|')[0]?.trim() || log.message),
          userEmail: context?.userEmail ?? null,
          userRole: context?.userRole ?? null,
          latestContext: context,
        };

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
            traceIds: traceId ? [traceId] : [],
            ...metadata,
            logs: [log],
          });
          return;
        }

        existingIssue.logs.push(log);
        existingIssue.occurrences += 1;
        existingIssue.firstSeen = timestamp < existingIssue.firstSeen ? timestamp : existingIssue.firstSeen;
        const isLatest = timestamp > existingIssue.lastSeen;
        existingIssue.lastSeen = isLatest ? timestamp : existingIssue.lastSeen;

        if (isLatest) {
          existingIssue.category = log.category;
          existingIssue.level = log.level;
          existingIssue.apiPath = metadata.apiPath ?? existingIssue.apiPath;
          existingIssue.httpMethod = metadata.httpMethod ?? existingIssue.httpMethod;
          existingIssue.statusCode = metadata.statusCode ?? existingIssue.statusCode;
          existingIssue.errorMessage = metadata.errorMessage ?? existingIssue.errorMessage;
          existingIssue.userEmail = metadata.userEmail ?? existingIssue.userEmail;
          existingIssue.userRole = metadata.userRole ?? existingIssue.userRole;
          existingIssue.latestContext = metadata.latestContext;
        }

        if (traceId && !existingIssue.traceIds.includes(traceId)) {
          existingIssue.traceIds.push(traceId);
        }
      });

    return Array.from(issueMap.values())
      .sort((left, right) => right.lastSeen.getTime() - left.lastSeen.getTime());
  }

  private getIssueTitle(log: SystemLog): string {
    const context = this.parseClientLogStack(log.details);

    if (context?.eventType) {
      const journeyTitle = this.toFriendlyJourneyTitle(context.eventType, log.message);

      if (context.apiPath) {
        return `${journeyTitle} · ${context.method || 'HTTP'} ${this.normalizeApiPath(context.apiPath)}`;
      }

      if (context.eventType === 'RouteGuardDenied') {
        return this.getRouteGuardIssueTitle(context);
      }

      return journeyTitle;
    }

    return this.toConciseTechnicalIssueTitle(log.message);
  }

  protected getIssueDisplaySignature(issue: LogIssue): string {
    return this.sanitizeVisibleLogText(issue.signature);
  }

  protected getLogDisplayMessage(log: SystemLog): string {
    return this.sanitizeVisibleLogText(log.message);
  }

  protected getTraceSummary(issue: LogIssue): string {
    const count = issue.traceIds.length;
    return count ? `${count} mã trace` : 'Chưa có trace';
  }

  protected getPrimaryTraceId(issue: LogIssue): string {
    return issue.traceIds[0] || 'N/A';
  }

  protected getIssueShortSummary(issue: LogIssue): string {
    if (issue.latestContext?.reason) {
      return this.sanitizeVisibleLogText(issue.latestContext.reason);
    }

    return this.sanitizeVisibleLogText(issue.errorMessage || issue.title);
  }

  private getEffectiveTraceId(log: SystemLog, context: ClientLogStackContext | null = this.parseClientLogStack(log.details)): string {
    return (log.traceId || context?.traceId || '').trim();
  }

  private getRouteGuardIssueTitle(context: ClientLogStackContext): string {
    const routeLabel = context.routeUrl?.startsWith('/admin') ? 'Admin' : context.routeUrl;

    if (context.reason === 'UnauthenticatedAdminAccess') {
      return 'Người dùng chưa đăng nhập bị chặn khỏi khu vực Admin';
    }

    if (context.reason === 'MissingAdminRole') {
      return 'Người dùng không đủ quyền truy cập khu vực Admin';
    }

    return routeLabel ? `Bị chặn truy cập · ${routeLabel}` : 'Bị chặn truy cập';
  }

  private toConciseTechnicalIssueTitle(message: string): string {
    const cleaned = this.sanitizeVisibleLogText(message.split('|')[0]?.trim() || message);
    const lower = cleaned.toLowerCase();

    if (lower.includes('error starting tomcat context')) {
      if (lower.includes('entitymanagerfactory') || lower.includes('jpa')) {
        return 'Backend startup failed: unresolved JPA EntityManager dependency';
      }

      if (lower.includes('unsatisfieddependencyexception')) {
        return 'Backend startup failed: unsatisfied Spring dependency';
      }

      return 'Backend startup failed: Tomcat context error';
    }

    const clientAbortPath = cleaned.match(/Client aborted connection .*?path:\s*([^\s]+)/i)?.[1];
    if (clientAbortPath) {
      return `Client aborted connection · ${clientAbortPath}`;
    }

    if (lower.includes('unsatisfieddependencyexception')) {
      return 'Spring dependency injection failed';
    }

    if (lower.includes('beancreationexception')) {
      return 'Spring bean creation failed';
    }

    if (lower.includes('cannot resolve reference to bean')) {
      return 'Spring bean reference could not be resolved';
    }

    return cleaned.length > 140 ? `${cleaned.slice(0, 137).trim()}...` : cleaned;
  }

  private sanitizeVisibleLogText(value: string | null | undefined): string {
    if (!value) {
      return 'N/A';
    }

    const cleaned = value
      .replace(/'[^']*\\x[0-9A-Fa-f]{2}[^']*'/g, "'[encoded value]'")
      .replace(/\\x[0-9A-Fa-f]{2}/g, ' ')
      .replace(/\\u[0-9A-Fa-f]{4}/g, ' ')
      .replace(/\\[rntbf]/g, ' ')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned || 'N/A';
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
        return eventType || this.sanitizeVisibleLogText(fallbackMessage.split('|')[0]?.trim() || fallbackMessage);
    }
  }

  private extractHttpMetadataFromText(text: string): { httpMethod?: string; apiPath?: string; statusCode?: number } {
    const methodUrlMatch = text.match(/\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+request\s+for\s+["']([^"']+)["']/i)
      || text.match(/\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(https?:\/\/[^\s"']+|\/[^\s"']+)/i);
    const pathOnlyMatch = text.match(/\bpath:\s*([^\s:|]+)/i);
    const statusMatch = text.match(/\b(?:status|statusCode|HTTP)[:\s]+(\d{3})\b/i);

    const rawPath = methodUrlMatch?.[2] || pathOnlyMatch?.[1];
    const statusCode = statusMatch?.[1] ? Number(statusMatch[1]) : undefined;

    return {
      httpMethod: methodUrlMatch?.[1]?.toUpperCase(),
      apiPath: rawPath ? this.normalizeApiPath(rawPath) : undefined,
      statusCode: Number.isFinite(statusCode) ? statusCode : undefined,
    };
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
