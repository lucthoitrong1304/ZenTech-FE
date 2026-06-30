import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { DialogModule } from 'primeng/dialog';
import { DatePicker } from 'primeng/datepicker';
import { Subscription, take } from 'rxjs';
import {
  LucideCircleAlert,
  LucideEllipsisVertical,
  LucideTrendingUp,
  LucideCalendar,
  LucideArrowUpRight,
  LucideRefreshCw,
  LucideCheck,
  LucideAlertTriangle,
  LucideFileText,
  LucideBot,
} from '@lucide/angular';
import { DashboardStore } from '../../data-access/store/dashboard.store';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { WebsocketService } from '../../../../../core/services/websocket.service';
import { ReportPeriod } from '../../../reports/data-access/models/reports.model';
import { ReportsService } from '../../../reports/data-access/services/reports.service';
import { ManagementBusinessImpactService } from '../../../business-impact/data-access/services/management-business-impact.service';
import { ManagementOrder } from '../../../orders/data-access/models/management-order.models';
import { HasPermissionDirective } from '../../../../../core/permissions/has-permission.directive';
import { AuthSessionStore } from '../../../../auth/data-access/store/auth-session.store';
import { Role } from '../../../../auth/data-access/models/auth.enums';
import { hasRole } from '../../../../auth/data-access/utils/auth-role.utils';

type LiveEventType = 'incident' | 'ticket' | 'resolved' | 'system';
type LiveChartMarker = 'normal' | 'incident' | 'ticket' | 'resolved';
type LiveStatusState = 'safe' | 'alert' | 'working';

interface LiveLogItem {
  time: string;
  dateTime: string;
  type: LiveEventType;
  title: string;
  description: string;
  code?: string;
  timestamp?: number;
  customerKey?: string;
  customerName?: string;
  customerEmail?: string;
  customerAvatarUrl?: string | null;
}

interface LiveChartPoint {
  label: string;
  value: number;
  marker: LiveChartMarker;
  eventTitle: string | null;
  eventDescription: string | null;
  eventDateTime: string | null;
  timestamp: number;
  isRevenueChangePoint?: boolean;
}


const LIVE_CHART_MAX_POINTS = 20;
const LIVE_CHART_TICK_MS = 4000;
const LIVE_DATA_REFRESH_MS = 15000;
const LIVE_OCCURRENCE_REFRESH_MS = 15000;
const LIVE_CHART_SEED_POINTS = 12;
const LIVE_CHART_STORAGE_KEY = 'zentech.management.dashboard.liveRevenuePoints';
const LIVE_CHART_HISTORY_TTL_MS = 2 * 60 * 60 * 1000;
const LIVE_RESOLVED_DEDUPE_WINDOW_MS = 5000;

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChartModule,
    DialogModule,
    DatePicker,
    HasPermissionDirective,
    LucideCircleAlert,
    LucideEllipsisVertical,
    LucideTrendingUp,
    LucideCalendar,
    LucideArrowUpRight,
    LucideRefreshCw,
    LucideCheck,
    LucideAlertTriangle,
    LucideFileText,
    LucideBot,
  ],
  providers: [DashboardStore],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  protected readonly store = inject(DashboardStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly websocketService = inject(WebsocketService);
  private readonly reportsService = inject(ReportsService);
  private readonly impactService = inject(ManagementBusinessImpactService);
  private readonly authSessionStore = inject(AuthSessionStore);

  private readonly subscriptions: Subscription[] = [];
  protected readonly canViewRevenue = computed(() => {
    const roles = this.authSessionStore.currentUser()?.roles ?? [];
    const hasManagementLeadRole = hasRole(roles, Role.OWNER) || hasRole(roles, Role.MANAGER);

    return hasManagementLeadRole || !hasRole(roles, Role.EMPLOYEE);
  });

  // Live Operations Monitor State
  protected readonly liveLogs = signal<LiveLogItem[]>([]);
  protected readonly liveChartData = signal<any>({ labels: [], datasets: [] });
  protected readonly liveRecentLogs = computed(() => this.liveLogs()
    .filter((log) => log.type !== 'system' && this.isTodayTimestamp(log.timestamp))
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)));
  protected readonly liveLatestLogs = computed(() => [...this.liveRecentLogs()]
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)));
  protected readonly showLiveMilestonesDialog = signal(false);
  protected readonly activeIncidents = computed(() => this.store.activeIncidents());
  protected readonly activeIncidentCount = computed(() => this.activeIncidents().length);
  protected readonly activeAffectedUsers = computed(() => this.activeIncidents()
    .reduce((total, incident: any) => total + Math.max(0, Number(incident?.affectedUsers ?? 0)), 0));
  protected readonly backlogIncidentSince = computed(() => {
    const todayStart = this.getTodayStart().getTime();
    const backlogDates = this.activeIncidents()
      .map((incident: any) => this.getEventDate(incident?.firstOccurredAt || incident?.occurredAt || incident?.createdAt))
      .filter((date): date is Date => date instanceof Date && date.getTime() < todayStart)
      .sort((a, b) => a.getTime() - b.getTime());
    return backlogDates[0] ? this.formatShortDate(backlogDates[0]) : null;
  });
  private readonly liveStatusRevision = signal(0);
  protected activeLiveIncidentId: string | null = null;
  protected activeLiveIncidentTitle: string | null = null;
  protected activeLiveTicketCode: string | null = null;

  private livePoints: LiveChartPoint[] = [];
  private liveRevenueBaseline: number | null = null;
  private processedLiveEventKeys = new Set<string>();
  private lastOccurrenceFetchByIncident = new Map<string, number>();
  private liveTimerId: any = null;
  private liveRefreshTimerId: any = null;


  // Expose enum to template
  protected readonly ReportPeriod = ReportPeriod;

  // Custom date picker range model
  protected dateRange: Date[] | null = null;
  protected readonly maxSelectableDate = new Date();

  // Computed chart data from store's revenueSeries
  protected readonly chartData = computed(() => {
    const series = this.store.revenueSeries();
    const labels = series.map((p) => p.label);
    const currentValues = series.map((p) => p.currentValue);
    const previousValues = series.map((p) => p.previousValue);

    // Format incident dates as DD/MM to match revenue labels
    const incidentDates = this.store.incidents().map((inc) => {
      const d = new Date(inc.occurredAt);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}`;
    });

    const pointRadii = series.map((p) => (incidentDates.includes(p.label) ? 6 : 2));
    const pointHoverRadii = series.map((p) => (incidentDates.includes(p.label) ? 8 : 6));
    const pointBgColors = series.map((p) => (incidentDates.includes(p.label) ? '#E11D48' : '#4F46E5'));
    const pointBorderColors = series.map((p) => (incidentDates.includes(p.label) ? '#FFE4E6' : '#FFFFFF'));
    const pointBorderWidths = series.map((p) => (incidentDates.includes(p.label) ? 2.5 : 1.5));

    return {
      labels,
      datasets: [
        {
          label: 'Doanh thu thực tế',
          data: currentValues,
          fill: true,
          borderColor: '#4F46E5', // Tech Indigo Accent
          backgroundColor: 'rgba(79, 70, 229, 0.03)',
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: pointRadii,
          pointHoverRadius: pointHoverRadii,
          pointBackgroundColor: pointBgColors,
          pointBorderColor: pointBorderColors,
          pointBorderWidth: pointBorderWidths,
        },
        {
          label: 'Doanh thu kỳ trước',
          data: previousValues,
          fill: false,
          borderColor: '#D1D5DB', // Soft Grey
          borderDash: [5, 5],
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: '#9CA3AF',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 1,
        },
      ],
    };
  });


  // Calculate critical and high priority technical tickets count
  protected readonly criticalTicketsCount = computed(() => {
    return this.store.activeTickets().filter(
      (t) => t.priority === 'CRITICAL' || t.priority === 'HIGH'
    ).length;
  });

  // Chart options aligning with Kinetic Monolith tech aesthetics
  protected readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          boxWidth: 12,
          font: {
            family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            size: 11,
            weight: '500',
          },
          color: '#374151',
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#101010',
        titleFont: {
          family: 'Inter, sans-serif',
          size: 12,
          weight: '700',
        },
        bodyFont: {
          family: 'Inter, sans-serif',
          size: 12,
        },
        padding: 10,
        cornerRadius: 6,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                maximumFractionDigits: 0,
              }).format(context.parsed.y);
            }
            return label;
          },
          afterBody: (context: any) => {
            const index = context[0].dataIndex;
            const series = this.store.revenueSeries();
            const p = series[index];
            if (p) {
              const matchingIncidents = this.store.incidents().filter((inc) => {
                const d = new Date(inc.occurredAt);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                return `${day}/${month}` === p.label;
              });
              if (matchingIncidents.length > 0) {
                return '\n' + matchingIncidents.map((inc) => `⚠️ Sự cố: ${inc.incidentCode} (${this.getFriendlyServiceName(inc)})`).join('\n');
              }
            }
            return '';
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            family: 'Inter, sans-serif',
            size: 10,
          },
          autoSkip: true,
          maxTicksLimit: 12,
        },
      },
      y: {
        border: {
          dash: [5, 5],
        },
        grid: {
          color: 'rgba(229, 231, 235, 0.6)',
        },
        ticks: {
          color: '#6B7280',
          font: {
            family: 'Inter, sans-serif',
            size: 10,
          },
          callback: (value: any) => {
            if (value >= 1000000) {
              return (value / 1000000) + 'M';
            }
            if (value >= 1000) {
              return (value / 1000) + 'k';
            }
            return value;
          },
        },
      },
    },
  };

  ngOnInit(): void {
    this.store.loadDashboardData({ period: this.store.period() });

    this.websocketService.connect();

    if (this.canViewRevenue()) {
      this.initLiveChart();
      this.refreshLiveRevenueBaseline();
      this.liveTimerId = setInterval(() => this.tickLiveChart(), LIVE_CHART_TICK_MS);
      this.liveRefreshTimerId = setInterval(() => {
        this.reloadDashboardSilently();
        this.refreshLiveRevenueBaseline();
      }, LIVE_DATA_REFRESH_MS);
    } else {
      this.liveRefreshTimerId = setInterval(() => this.reloadDashboardSilently(), LIVE_DATA_REFRESH_MS);
    }

    this.subscriptions.push(
      this.websocketService.subscribe<any>('/topic/admin.incidents').subscribe((payload) => {
        this.reloadDashboardSilently();

        if (!payload) {
          return;
        }

        this.recordIncidentEvent(payload, 'websocket');
      })
    );

    this.subscriptions.push(
      this.websocketService.subscribe<any>('/topic/admin.tickets').subscribe((payload) => {
        this.reloadDashboardSilently();

        if (!payload) {
          return;
        }

        this.recordTicketEvent(payload, 'websocket');
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    if (this.liveTimerId) {
      clearInterval(this.liveTimerId);
    }
    if (this.liveRefreshTimerId) {
      clearInterval(this.liveRefreshTimerId);
    }
  }

  protected openLiveMilestonesDialog(): void {
    this.showLiveMilestonesDialog.set(true);
  }

  protected closeLiveMilestonesDialog(): void {
    this.showLiveMilestonesDialog.set(false);
  }
  protected changePeriod(period: ReportPeriod): void {
    this.store.setPeriod(period);
    if (period !== ReportPeriod.Custom) {
      this.dateRange = null;
    }
  }

  protected onDateRangeChange(): void {
    const [startDate, endDate] = this.dateRange ?? [];
    if (!startDate || !endDate) {
      return;
    }

    this.store.setCustomDates(
      this.toLocalStartOfDay(startDate).toISOString(),
      this.toLocalEndOfDay(endDate).toISOString()
    );
  }

  private toLocalStartOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private toLocalEndOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }
  protected refreshData(): void {
    if (this.store.period() === ReportPeriod.Custom && this.store.customStartDate() && this.store.customEndDate()) {
      this.store.loadDashboardData({
        period: ReportPeriod.Custom,
        startDate: this.store.customStartDate(),
        endDate: this.store.customEndDate(),
      });
    } else {
      this.store.loadDashboardData({ period: this.store.period() });
    }
    this.toast.success('Đồng bộ dữ liệu bảng điều khiển thành công.');
  }


  protected viewOrderDetails(orderId: string): void {
    this.router.navigate(['/management/orders'], {
      queryParams: { keyword: orderId },
    });
  }

  protected viewTicketDetails(ticketCode: string): void {
    this.router.navigate(['/management/tickets'], {
      queryParams: { search: ticketCode },
    });
  }

  protected viewIncidentDetails(): void {
    this.router.navigate(['/management/analytics']);
  }

  protected openIncidentDetail(incidentId: string): void {
    this.store.loadIncidentDetail(incidentId);
  }

  protected requestAiIncidentAnalysis(): void {
    const inc = this.store.selectedIncident();
    if (inc) {
      this.store.requestIncidentAiAnalysis(inc.incidentId);
      this.toast.success('Đang gửi yêu cầu phân tích sự cố lên hệ thống AI...');
    }
  }

  protected readonly liveStatusState = computed<LiveStatusState>(() => {
    this.liveStatusRevision();
    if (this.getCurrentActiveTicket()) {
      return 'working';
    }
    if (this.getCurrentActiveIncident()) {
      return 'alert';
    }
    return 'safe';
  });

  protected readonly liveStatusTitle = computed(() => {
    this.liveStatusRevision();
    const ticket = this.getCurrentActiveTicket();
    if (ticket) {
      return 'Đội kỹ thuật đang xử lý';
    }

    const incident = this.getCurrentActiveIncident();
    if (incident) {
      const title = incident.title || this.activeLiveIncidentTitle || this.toBusinessIncident(incident).title;
      return `Đang có sự cố: ${title}`;
    }

    return 'Hệ thống an toàn';
  });

  private getCurrentActiveTicket(): any | null {
    const activeTicket = this.store.activeTickets().find((ticket: any) => !this.isResolvedStatus(ticket?.status));
    return activeTicket || (this.activeLiveTicketCode ? { code: this.activeLiveTicketCode } : null);
  }

  private getCurrentActiveIncident(): any | null {
    const activeIncident = this.activeIncidents()[0];
    return activeIncident || (this.activeLiveIncidentId ? { title: this.activeLiveIncidentTitle, incidentId: this.activeLiveIncidentId } : null);
  }

  private bumpLiveStatus(): void {
    this.liveStatusRevision.update((value) => value + 1);
  }
  private toBusinessIncident(payload: any): { title: string; description: string; displayCode?: string } {
    const title = this.getBusinessIssueTitle(payload);
    const displayCode = this.getSafeDisplayCode(payload.code || payload.incidentCode);
    return {
      title,
      description: this.getBusinessIssueDescription(title),
      displayCode,
    };
  }

  private toBusinessTicket(payload: any): { title: string; description: string; displayCode?: string } {
    const title = this.getBusinessIssueTitle(payload);
    const displayCode = this.getSafeDisplayCode(payload.code);
    return {
      title,
      description: displayCode
        ? `Ticket ${displayCode} đã được tạo để đội kỹ thuật xử lý ${title.toLowerCase()}.`
        : `Ticket đã được tạo để đội kỹ thuật xử lý ${title.toLowerCase()}.`,
      displayCode,
    };
  }
  private getBusinessIssueTitle(source: any): string {
    const haystack = [
      source?.apiPath,
      source?.title,
      source?.description,
      source?.message,
      source?.errorMessage,
      source?.serviceName,
      source?.category,
    ].filter(Boolean).join(' ').toLowerCase();

    if (haystack.includes('checkout') || haystack.includes('payment') || haystack.includes('momo') || haystack.includes('vnpay')) {
      return 'Lỗi đặt hàng và thanh toán';
    }
    if (haystack.includes('login') || haystack.includes('auth') || haystack.includes('token') || haystack.includes('unauthorized') || haystack.includes('401')) {
      return 'Lỗi đăng nhập';
    }
    if (haystack.includes('cart')) {
      return 'Lỗi giỏ hàng';
    }
    if (haystack.includes('product')) {
      return 'Lỗi xem sản phẩm';
    }
    if (haystack.includes('chat') || haystack.includes('conversation') || haystack.includes('consult')) {
      return 'Gián đoạn tư vấn khách hàng';
    }
    if (haystack.includes('ai-service') || haystack.includes('ai service') || haystack.includes('agent')) {
      return 'Gián đoạn hỗ trợ AI';
    }
    return 'Lỗi vận hành hệ thống';
  }

  private getBusinessIssueDescription(title: string): string {
    if (title === 'Lỗi đặt hàng và thanh toán') {
      return 'Một số khách hàng có thể không hoàn tất đơn hàng hoặc thanh toán trong thời điểm này.';
    }
    if (title === 'Lỗi đăng nhập') {
      return 'Một số phiên đăng nhập bị gián đoạn, người dùng có thể cần đăng nhập lại.';
    }
    if (title === 'Lỗi giỏ hàng') {
      return 'Một số khách hàng có thể gặp khó khăn khi cập nhật hoặc kiểm tra giỏ hàng.';
    }
    if (title === 'Lỗi xem sản phẩm') {
      return 'Một số khách hàng có thể gặp khó khăn khi xem danh sách hoặc chi tiết sản phẩm.';
    }
    if (title === 'Gián đoạn tư vấn khách hàng') {
      return 'Một số cuộc tư vấn khách hàng có thể bị chậm hoặc cần kết nối lại.';
    }
    if (title === 'Gián đoạn hỗ trợ AI') {
      return 'Một số tác vụ hỗ trợ tự động có thể phản hồi chậm hoặc tạm thời không khả dụng.';
    }
    return 'Hệ thống ghi nhận bất thường có thể ảnh hưởng đến trải nghiệm khách hàng.';
  }

  private getSafeDisplayCode(value: unknown): string | undefined {
    const text = String(value || '').trim();
    if (!text || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
      return undefined;
    }
    return text;
  }

  private getIncidentKey(payload: any): string {
    return String(payload?.incidentId || payload?.id || payload?.code || payload?.incidentCode || 'active-incident');
  }

  private isResolvedStatus(status: unknown): boolean {
    const normalized = String(status || '').toUpperCase();
    return normalized === 'RESOLVED' || normalized === 'CLOSED' || normalized === 'DONE';
  }
  protected getFriendlyServiceName(inc: any): string {
    if (!inc) return 'Lỗi hệ thống không xác định';
    const path = (inc.apiPath || '').toLowerCase();
    if (path.includes('/checkout')) return 'Lỗi đặt hàng & thanh toán (Checkout)';
    if (path.includes('/payments/momo')) return 'Lỗi cổng thanh toán MoMo';
    if (path.includes('/payments/vnpay')) return 'Lỗi cổng thanh toán VNPay';
    if (path.includes('/cart')) return 'Lỗi giỏ hàng (Cart API)';
    if (path.includes('/products')) return 'Lỗi xem danh mục & sản phẩm';
    if (path.includes('/login') || path.includes('/auth')) return 'Lỗi xác thực & đăng nhập';

    if (inc.serviceName === 'backend') {
      return 'Lỗi dịch vụ hệ thống';
    }
    if (inc.serviceName === 'ai-service') {
      return 'Lỗi máy chủ AI';
    }
    return 'Lỗi hệ thống không xác định';
  }

  protected stripHtml(html: string | null | undefined): string {
    if (!html) return '';
    let tmp = html.replace(/<[^>]*>/g, '');
    tmp = tmp.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"');
    return tmp.trim();
  }

  protected getFriendlyTicketDescription(desc: string | null | undefined): string {
    if (!desc) return '';
    const cleanDesc = this.stripHtml(desc);

    if (cleanDesc.includes('/api/customers/me/checkout') || cleanDesc.includes('/checkout')) {
      return 'Hệ thống tự động ghi nhận sự cố gián đoạn tại chức năng đặt hàng & thanh toán (Checkout).';
    }
    if (cleanDesc.includes('/api/payments/momo') || cleanDesc.includes('momo')) {
      return 'Hệ thống tự động ghi nhận lỗi kết nối cổng thanh toán ví điện tử MoMo.';
    }
    if (cleanDesc.includes('/api/payments/vnpay') || cleanDesc.includes('vnpay')) {
      return 'Hệ thống tự động ghi nhận lỗi kết nối cổng thanh toán VNPay.';
    }
    if (cleanDesc.includes('/api/cart') || cleanDesc.includes('/cart')) {
      return 'Hệ thống tự động ghi nhận lỗi đồng bộ giỏ hàng của khách hàng.';
    }
    if (cleanDesc.includes('/api/products') || cleanDesc.includes('/products')) {
      return 'Hệ thống tự động ghi nhận lỗi tải danh sách hoặc chi tiết sản phẩm.';
    }
    if (cleanDesc.includes('/api/auth') || cleanDesc.includes('/login') || cleanDesc.includes('/auth')) {
      return 'Hệ thống tự động ghi nhận lỗi gián đoạn xác thực và đăng nhập tài khoản.';
    }
    if (cleanDesc.includes('Sự cố phát sinh tại API') || cleanDesc.includes('/api/')) {
      return 'Hệ thống tự động phát hiện sự cố gián đoạn dịch vụ kỹ thuật.';
    }

    return cleanDesc;
  }

  protected getFriendlyTicketTitle(title: string | null | undefined): string {
    if (!title) return 'Yêu cầu xử lý kỹ thuật';

    let friendly = title;

    if (friendly.includes('Cannot create MoMo payment') || friendly.includes('momo')) {
      friendly = friendly.replace(/Cannot create MoMo payment/i, 'Không thể khởi tạo thanh toán qua ví MoMo');
    }
    if (friendly.includes('checkout') || friendly.includes('Cannot checkout')) {
      friendly = friendly.replace(/Cannot checkout/i, 'Lỗi tiến trình đặt hàng & thanh toán (Checkout)');
    }
    if (friendly.includes('login') || friendly.includes('auth')) {
      friendly = friendly.replace(/login/i, 'Đăng nhập hệ thống').replace(/auth/i, 'Xác thực tài khoản');
    }

    friendly = friendly.replace(/^Sửa lỗi sự cố/i, 'Khắc phục lỗi');

    return friendly;
  }

  // Format helpers
  protected formatCurrency(value: number | undefined | null): string {
    if (value === undefined || value === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }

  protected formatPercent(value: number | undefined | null): string {
    if (value === undefined || value === null) return '0%';
    return (value >= 0 ? '+' : '') + value.toFixed(1) + '%';
  }

  protected getInitials(value?: string | null): string {
    const initials = (value || 'ZT')
      .trim()
      .split(/\s+|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
    return initials || 'ZT';
  }

  protected getAvatarGradient(seed?: string | null): string {
    const text = seed || 'zentech';
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #2af598 0%, #009efd 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
      'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
      'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
      'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    ];
    return gradients[Math.abs(hash) % gradients.length];
  }

  // Live Operations Monitor helper methods
  private initLiveChart(): void {
    if (!this.restoreLiveChartHistory()) {
      this.seedLiveChartFromCurrentRevenue();
    }
    this.liveLogs.set([
      {
        time: this.formatLiveTime(),
        dateTime: this.formatLiveDateTime(),
        type: 'system',
        timestamp: Date.now(),
        title: 'Đang theo dõi doanh thu realtime',
        description: 'Hệ thống sẽ đánh dấu sự cố, ticket và thời điểm khắc phục ngay trên biểu đồ.',
      },
    ]);
  }

  private seedLiveChartFromCurrentRevenue(): void {
    const now = Date.now();
    const baseRevenue = this.getCurrentLiveRevenue();

    this.livePoints = Array.from({ length: LIVE_CHART_SEED_POINTS }, (_, index) => {
      const timestamp = now - (LIVE_CHART_SEED_POINTS - index - 1) * LIVE_CHART_TICK_MS;
      const pointTime = new Date(timestamp);
      return {
        label: this.formatLiveTime(pointTime),
        value: baseRevenue,
        marker: 'normal' as LiveChartMarker,
        eventTitle: null,
        eventDescription: null,
        eventDateTime: null,
        timestamp,
      };
    });

    this.updateLiveChartReference();
    this.persistLiveChartHistory();
  }


  private restoreLiveChartHistory(): boolean {
    try {
      const raw = localStorage.getItem(LIVE_CHART_STORAGE_KEY);
      if (!raw) {
        return false;
      }

      const now = Date.now();
      const parsed = JSON.parse(raw) as Partial<LiveChartPoint>[];
      const restoredPoints = parsed
        .filter((point) => typeof point.timestamp === 'number' && typeof point.value === 'number')
        .filter((point) => {
          const timestamp = point.timestamp as number;
          return timestamp <= now + LIVE_CHART_TICK_MS
            && now - timestamp <= LIVE_CHART_HISTORY_TTL_MS
            && this.isTodayTimestamp(timestamp);
        })
        .map((point) => {
          const timestamp = point.timestamp as number;
          return {
            label: this.formatLiveTime(new Date(timestamp)),
            value: Math.max(0, Number(point.value ?? 0)),
            marker: (point.marker || 'normal') as LiveChartMarker,
            eventTitle: point.eventTitle || null,
            eventDescription: point.eventDescription || null,
            eventDateTime: point.eventDateTime || null,
            timestamp,
            isRevenueChangePoint: Boolean(point.isRevenueChangePoint),
          };
        })
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-LIVE_CHART_MAX_POINTS);

      if (restoredPoints.length < 2) {
        return false;
      }

      for (let index = 1; index < restoredPoints.length; index++) {
        if (Math.abs(restoredPoints[index].value - restoredPoints[index - 1].value) > 0) {
          restoredPoints[index - 1].isRevenueChangePoint = true;
          restoredPoints[index].isRevenueChangePoint = true;
        }
      }

      this.livePoints = this.dedupeResolvedPoints(restoredPoints);
      this.trimAndSortLivePoints();
      this.updateLiveChartReference();
      return true;
    } catch {
      return false;
    }
  }

  private persistLiveChartHistory(): void {
    try {
      localStorage.setItem(LIVE_CHART_STORAGE_KEY, JSON.stringify(this.livePoints));
    } catch {
      // Ignore storage quota/private mode errors; realtime chart can continue in memory.
    }
  }

  private tickLiveChart(): void {
    this.livePoints = this.livePoints.filter((point) => this.isTodayTimestamp(point.timestamp));
    this.syncLiveEventsFromStore();
    this.syncLiveRevenueFromOrders();

    const now = new Date();
    const currentRevenue = this.getCurrentLiveRevenue();
    const latestRevenuePoint = [...this.livePoints]
      .reverse()
      .find((point) => point.marker === 'normal');
    const isRevenueChangePoint = latestRevenuePoint
      ? Math.abs(latestRevenuePoint.value - currentRevenue) > 0
      : false;

    if (isRevenueChangePoint && latestRevenuePoint) {
      latestRevenuePoint.isRevenueChangePoint = true;
    }

    const shouldAppendCurrentPoint = !latestRevenuePoint
      || Math.abs(latestRevenuePoint.timestamp - now.getTime()) > LIVE_CHART_TICK_MS - 250
      || isRevenueChangePoint;

    if (shouldAppendCurrentPoint) {
      this.livePoints.push({
        label: this.formatLiveTime(now),
        value: currentRevenue,
        marker: 'normal',
        eventTitle: null,
        eventDescription: null,
        eventDateTime: null,
        timestamp: now.getTime(),
        isRevenueChangePoint,
      });
    }

    this.trimAndSortLivePoints();
    this.updateLiveChartReference();
    this.persistLiveChartHistory();
  }
  private getCurrentLiveRevenue(): number {
    return Math.max(0, this.getLiveRevenueBaseline());
  }

  private getLiveRevenueBaseline(): number {
    if (this.liveRevenueBaseline !== null) {
      return this.liveRevenueBaseline;
    }

    if (this.store.period() === ReportPeriod.Today) {
      return Math.max(0, this.store.summary()?.totalRevenue ?? 0);
    }

    return 0;
  }

  private refreshLiveRevenueBaseline(): void {
    const sub = this.reportsService.getSummary(ReportPeriod.Today).pipe(take(1)).subscribe({
      next: (response) => {
        const nextRevenue = Math.max(0, response.data?.totalRevenue ?? 0);
        const previousRevenue = this.liveRevenueBaseline ?? 0;
        this.liveRevenueBaseline = nextRevenue;

        const hasEventMarkers = this.livePoints.some((point) => point.marker !== 'normal');
        if (!hasEventMarkers && previousRevenue === 0 && nextRevenue > 0 && this.livePoints.every((point) => point.value === 0)) {
          this.syncLiveRevenueFromOrders();
          if (this.livePoints.length === 0) {
            this.seedLiveChartFromCurrentRevenue();
          }
        } else if (previousRevenue !== nextRevenue) {
          this.syncLiveRevenueFromOrders();
          this.persistLiveChartHistory();
        }
      },
      error: () => {
        if (this.liveRevenueBaseline === null && this.store.period() === ReportPeriod.Today) {
          this.liveRevenueBaseline = Math.max(0, this.store.summary()?.totalRevenue ?? 0);
        }
      },
    });

    this.subscriptions.push(sub);
  }

  private syncLiveRevenueFromOrders(): void {
    const revenuePoints = this.buildTodayRevenuePointsFromOrders();
    if (revenuePoints.length === 0) {
      return;
    }

    const eventPoints = this.livePoints.filter((point) => point.marker !== 'normal');
    this.livePoints = [...revenuePoints, ...eventPoints];
    this.trimAndSortLivePoints();
  }

  private buildTodayRevenuePointsFromOrders(): LiveChartPoint[] {
    const todayStart = this.getTodayStart();
    const completedOrders = this.store.todayRevenueOrders()
      .filter((order: ManagementOrder) => {
        const isCompleted = order.orderStatus === 'COMPLETED';
        const isPaidOnline = order.paymentStatus === 'SUCCESS' &&
          order.orderStatus !== 'CANCELLED' &&
          order.orderStatus !== 'RETURNED';
        return isCompleted || isPaidOnline;
      })
      .map((order: ManagementOrder) => ({ order, date: this.getEventDate(order.createdAt) }))
      .filter((entry): entry is { order: ManagementOrder; date: Date } => {
        return entry.date instanceof Date && this.isTodayDate(entry.date);
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const points: LiveChartPoint[] = [{
      label: this.formatLiveTime(todayStart),
      value: 0,
      marker: 'normal',
      eventTitle: 'Bắt đầu ngày',
      eventDescription: 'Doanh thu realtime được tính từ 00:00 hôm nay.',
      eventDateTime: this.formatLiveDateTime(todayStart),
      timestamp: todayStart.getTime(),
      isRevenueChangePoint: false,
    }];

    let cumulativeRevenue = 0;
    for (const { order, date } of completedOrders) {
      cumulativeRevenue += Math.max(0, Number(order.finalPrice ?? 0));
      const isCompleted = order.orderStatus === 'COMPLETED';
      points.push({
        label: this.formatLiveTime(date),
        value: cumulativeRevenue,
        marker: 'normal',
        eventTitle: isCompleted ? `Đơn hoàn thành #${order.orderCode}` : `Đơn thanh toán #${order.orderCode}`,
        eventDescription: isCompleted
          ? `Cộng ${this.formatCurrency(order.finalPrice)} vào doanh thu hôm nay.`
          : `Cộng ${this.formatCurrency(order.finalPrice)} vào doanh thu hôm nay (Thanh toán online).`,
        eventDateTime: this.formatLiveDateTime(date),
        timestamp: date.getTime(),
        isRevenueChangePoint: true,
      });
    }

    const currentRevenue = this.getCurrentLiveRevenue();
    if (currentRevenue > cumulativeRevenue) {
      const now = new Date();
      points.push({
        label: this.formatLiveTime(now),
        value: currentRevenue,
        marker: 'normal',
        eventTitle: 'Tổng doanh thu hiện tại',
        eventDescription: 'Tổng từ báo cáo cao hơn danh sách đơn đang tải, nên dashboard đồng bộ về số tổng hiện tại.',
        eventDateTime: this.formatLiveDateTime(now),
        timestamp: now.getTime(),
        isRevenueChangePoint: currentRevenue !== cumulativeRevenue,
      });
    }

    return points;
  }
  private syncLiveEventsFromStore(): void {
    for (const incident of this.store.incidents()) {
      this.syncIncidentOccurrencesFromAffectedUsers(incident);
      this.recordIncidentEvent(incident, 'store');
    }

    for (const ticket of this.store.activeTickets()) {
      this.recordTicketEvent(ticket, 'store');
    }
  }

  private syncIncidentOccurrencesFromAffectedUsers(incident: any): void {
    const incidentId = this.getIncidentKey(incident);
    const now = Date.now();
    const lastFetch = this.lastOccurrenceFetchByIncident.get(incidentId) ?? 0;

    if (now - lastFetch < LIVE_OCCURRENCE_REFRESH_MS) {
      return;
    }

    this.lastOccurrenceFetchByIncident.set(incidentId, now);

    const sub = this.impactService.getAffectedUsers(incidentId).pipe(take(1)).subscribe({
      next: (response) => {
        const affectedUsers = response.data || [];
        if (affectedUsers.length === 0) {
          this.recordIncidentEvent(incident, 'store-fallback');
          return;
        }

        const sortedAffectedUsers = [...affectedUsers].sort((a, b) => {
          const firstTime = this.getEventDate(a?.lastEventAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          const secondTime = this.getEventDate(b?.lastEventAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          return firstTime - secondTime;
        });

        for (const affectedUser of sortedAffectedUsers) {
          this.recordIncidentOccurrenceEvent(incident, affectedUser);
        }
      },
      error: () => {
        this.recordIncidentEvent(incident, 'store-fallback');
      },
    });

    this.subscriptions.push(sub);
  }

  private recordIncidentOccurrenceEvent(incident: any, affectedUser: any): void {
    const eventDate = this.getEventDate(affectedUser?.lastEventAt);
    if (!eventDate || !this.isTodayDate(eventDate)) {
      return;
    }

    const issue = this.toBusinessIncident(incident);
    const incidentId = this.getIncidentKey(incident);
    const occurrenceKey = affectedUser?.traceId || `${affectedUser?.email || 'guest'}:${eventDate.toISOString()}`;
    const eventKey = `incident-occurrence:${incidentId}:${occurrenceKey}:${eventDate.toISOString()}`;
    if (this.processedLiveEventKeys.has(eventKey)) {
      return;
    }

    const previousIncidentLogs = this.liveLogs().filter((log) => {
      return log.type === 'incident'
        && log.code === issue.displayCode
        && log.title === issue.title
        && (log.timestamp ?? 0) < eventDate.getTime();
    });
    const customerName = affectedUser?.fullName || affectedUser?.email || 'Một khách hàng';
    const customerKey = String(affectedUser?.userId || affectedUser?.email || customerName).toLowerCase();
    const hasPreviousOccurrence = previousIncidentLogs.length > 0;
    const hasSameCustomerBefore = previousIncidentLogs.some((log) => log.customerKey === customerKey);
    const customerEmail = affectedUser?.email || null;
    const customerAvatarUrl = affectedUser?.avatarUrl || null;
    const description = !hasPreviousOccurrence
      ? 'Gặp lỗi này lần đầu trong quá trình mua hàng.'
      : hasSameCustomerBefore
        ? 'Tiếp tục gặp lỗi này trong quá trình mua hàng.'
        : 'Cũng gặp lỗi này trong quá trình mua hàng.';
    const logItem: LiveLogItem = {
      time: this.formatLiveTime(eventDate),
      dateTime: this.formatLiveDateTime(eventDate),
      type: 'incident',
      title: issue.title,
      description,
      code: issue.displayCode,
      customerKey,
      customerName,
      customerEmail,
      customerAvatarUrl,
    };

    this.removeDuplicateAggregateIncident(logItem, eventDate);
    this.activeLiveIncidentId = incidentId;
    this.activeLiveIncidentTitle = issue.title;
    this.bumpLiveStatus();
    this.recordLiveEvent(eventKey, logItem, 'incident', eventDate);
  }

  private removeDuplicateAggregateIncident(logItem: LiveLogItem, eventDate: Date): void {
    const eventTimestamp = eventDate.getTime();
    this.liveLogs.update((current) => current.filter((existing) => {
      const sameIncidentMoment = existing.type === 'incident'
        && existing.title === logItem.title
        && existing.code === logItem.code
        && existing.dateTime === logItem.dateTime;
      return !sameIncidentMoment;
    }));

    this.livePoints = this.livePoints.filter((point) => {
      const sameIncidentMoment = point.marker === 'incident'
        && point.eventTitle === logItem.title
        && point.eventDateTime === logItem.dateTime
        && point.timestamp === eventTimestamp;
      return !sameIncidentMoment;
    });
  }
  private recordIncidentEvent(payload: any, source: 'store' | 'store-fallback' | 'websocket'): void {
    const issue = this.toBusinessIncident(payload);
    const resolved = this.isResolvedStatus(payload?.status);
    const occurredAt = this.getEventDate(
      source === 'store'
        ? (payload?.firstOccurredAt || payload?.occurredAt || payload?.createdAt)
        : (payload?.occurredAt || payload?.firstOccurredAt || payload?.createdAt)
    );
    const resolvedAt = this.getEventDate(payload?.resolvedAt);
    const eventDate = resolved ? (resolvedAt || occurredAt || new Date()) : (occurredAt || new Date());
    const eventKey = resolved
      ? `incident:${this.getIncidentKey(payload)}:resolved`
      : `incident:${this.getIncidentKey(payload)}:detected:${eventDate.toISOString()}`;

    if (resolved) {
      this.activeLiveIncidentId = null;
      this.activeLiveIncidentTitle = null;
      this.bumpLiveStatus();
      this.recordLiveEvent(
        eventKey,
        {
          time: this.formatLiveTime(eventDate),
          dateTime: this.formatLiveDateTime(eventDate),
          type: 'resolved',
          title: 'Đã khắc phục sự cố',
          description: `${issue.title} đã được xử lý, doanh thu có thể trở lại bình thường.`,
          code: issue.displayCode,
        },
        'resolved',
        eventDate
      );
      if (source === 'websocket') {
        this.toast.success(`Đã khắc phục ${issue.title}.`);
      }
      return;
    }

    this.activeLiveIncidentId = this.getIncidentKey(payload);
    this.activeLiveIncidentTitle = issue.title;
    this.bumpLiveStatus();

    if (source === 'store') {
      return;
    }

    this.recordLiveEvent(
      eventKey,
      {
        time: this.formatLiveTime(eventDate),
        dateTime: this.formatLiveDateTime(eventDate),
        type: 'incident',
        title: issue.title,
        description: issue.description,
        code: issue.displayCode,
      },
      'incident',
      eventDate
    );
    if (source === 'websocket') {
      this.toast.error(`Phát hiện sự cố: ${issue.title}.`);
    }
  }

  private recordTicketEvent(payload: any, source: 'store' | 'websocket'): void {
    const ticket = this.toBusinessTicket(payload);
    const resolved = this.isResolvedStatus(payload?.status);
    const createdAt = this.getEventDate(payload?.createdAt);
    const resolvedAt = this.getEventDate(payload?.resolvedAt);
    const eventDate = resolved ? (resolvedAt || createdAt || new Date()) : (createdAt || new Date());
    const ticketKey = payload?.id || payload?.code || payload?.incidentId || 'unknown';
    const eventKey = resolved
      ? `ticket:${ticketKey}:resolved`
      : `ticket:${ticketKey}:created:${eventDate.toISOString()}`;

    if (resolved) {
      this.activeLiveTicketCode = null;
      this.bumpLiveStatus();
      this.recordLiveEvent(
        eventKey,
        {
          time: this.formatLiveTime(eventDate),
          dateTime: this.formatLiveDateTime(eventDate),
          type: 'resolved',
          title: 'Ticket đã khắc phục xong',
          description: `${ticket.title} đã được xử lý.`,
          code: ticket.displayCode,
        },
        'resolved',
        eventDate
      );
      return;
    }

    this.activeLiveTicketCode = ticket.displayCode || 'ticket-active';
    this.bumpLiveStatus();
    this.recordLiveEvent(
      eventKey,
      {
        time: this.formatLiveTime(eventDate),
        dateTime: this.formatLiveDateTime(eventDate),
        type: 'ticket',
        title: 'Đội kỹ thuật đang xử lý',
        description: ticket.description,
        code: ticket.displayCode,
      },
      'ticket',
      eventDate
    );
    if (source === 'websocket') {
      this.toast.info(`Đội kỹ thuật đang xử lý ${ticket.title}.`);
    }
  }

  private recordLiveEvent(
    eventKey: string,
    logItem: LiveLogItem,
    marker: Exclude<LiveChartMarker, 'normal'>,
    eventDate: Date
  ): void {
    if (!this.isTodayDate(eventDate)) {
      return;
    }

    if (this.processedLiveEventKeys.has(eventKey)) {
      return;
    }

    this.processedLiveEventKeys.add(eventKey);
    this.addLiveLog({ ...logItem, timestamp: eventDate.getTime() });
    this.livePoints.push({
      label: this.formatLiveTime(eventDate),
      value: this.getLiveRevenueAtTimestamp(eventDate.getTime()),
      marker,
      eventTitle: logItem.title,
      eventDescription: logItem.description,
      eventDateTime: logItem.dateTime,
      timestamp: eventDate.getTime(),
    });
    this.trimAndSortLivePoints();
    this.updateLiveChartReference();
    this.persistLiveChartHistory();
  }

  private getLiveRevenueAtTimestamp(timestamp: number): number {
    const orderRevenue = this.store.todayRevenueOrders()
      .filter((order: ManagementOrder) => order.orderStatus === 'COMPLETED')
      .reduce((total: number, order: ManagementOrder) => {
        const orderDate = this.getEventDate(order.createdAt);
        if (!orderDate || !this.isTodayDate(orderDate) || orderDate.getTime() > timestamp) {
          return total;
        }
        return total + Math.max(0, Number(order.finalPrice ?? 0));
      }, 0);

    if (orderRevenue > 0) {
      return orderRevenue;
    }

    const previousRevenuePoint = [...this.livePoints]
      .filter((point) => point.marker === 'normal' && point.timestamp <= timestamp)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    return Math.max(0, previousRevenuePoint?.value ?? 0);
  }
  private dedupeResolvedPoints(points: LiveChartPoint[]): LiveChartPoint[] {
    const sortedPoints = [...points].sort((a, b) => a.timestamp - b.timestamp);
    return sortedPoints.filter((point, index, allPoints) => {
      if (point.marker !== 'resolved') {
        return true;
      }

      const firstResolvedIndex = allPoints.findIndex((candidate) => {
        return candidate.marker === 'resolved'
          && Math.abs(candidate.timestamp - point.timestamp) <= LIVE_RESOLVED_DEDUPE_WINDOW_MS;
      });
      return firstResolvedIndex === index;
    });
  }


  private trimAndSortLivePoints(): void {
    const sortedPoints = this.dedupeResolvedPoints(this.livePoints)
      .sort((a, b) => a.timestamp - b.timestamp);
    const protectedPoints = sortedPoints
      .filter((point) => point.marker !== 'normal' || point.isRevenueChangePoint)
      .slice(-LIVE_CHART_MAX_POINTS);
    const protectedPointKeys = new Set(
      protectedPoints.map((point) => `${point.timestamp}:${point.marker}:${point.value}`)
    );
    const normalPointLimit = Math.max(0, LIVE_CHART_MAX_POINTS - protectedPoints.length);
    const normalCandidates = sortedPoints
      .filter((point) => point.marker === 'normal')
      .filter((point) => !protectedPointKeys.has(`${point.timestamp}:${point.marker}:${point.value}`));
    const normalPoints = normalPointLimit > 0
      ? normalCandidates.slice(-normalPointLimit)
      : [];

    this.livePoints = [...protectedPoints, ...normalPoints]
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  private getEventDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private getTodayStart(): Date {
    return this.toLocalStartOfDay(new Date());
  }

  private isTodayDate(date: Date): boolean {
    const timestamp = date.getTime();
    const start = this.getTodayStart().getTime();
    const end = this.toLocalEndOfDay(new Date()).getTime();
    return timestamp >= start && timestamp <= end;
  }

  private isTodayTimestamp(timestamp: number | undefined): boolean {
    return typeof timestamp === 'number' && this.isTodayDate(new Date(timestamp));
  }

  private formatShortDate(date: Date): string {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }
  private reloadDashboardSilently(): void {
    this.store.loadDashboardData({
      period: this.store.period(),
      startDate: this.store.customStartDate(),
      endDate: this.store.customEndDate(),
      silent: true,
    });
  }

  private updateLiveChartReference(): void {
    const pointRadius = this.livePoints.map((point) => point.marker === 'normal' ? (point.isRevenueChangePoint ? 5 : 2) : 8);
    const pointBgColors = this.livePoints.map((point) => {
      if (point.marker === 'incident') return '#E11D48';
      if (point.marker === 'ticket') return '#F59E0B';
      if (point.marker === 'resolved') return '#10B981';
      return '#4F46E5';
    });
    const pointStyles = this.livePoints.map((point) => {
      if (point.marker === 'incident') return 'rectRot';
      if (point.marker === 'ticket') return 'triangle';
      if (point.marker === 'resolved') return 'rect';
      return 'circle';
    });

    this.liveChartData.set({
      labels: this.livePoints.map((point) => point.label),
      datasets: [
        {
          label: 'Doanh thu truc tiep',
          data: this.livePoints.map((point) => point.value),
          fill: true,
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(79, 70, 229, 0.03)',
          tension: 0,
          stepped: 'after',
          borderWidth: 2,
          pointRadius,
          pointHoverRadius: pointRadius.map((radius) => radius + 2),
          pointBackgroundColor: pointBgColors,
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 1.5,
          pointStyle: pointStyles,
        },
      ],
    });
  }

  private formatLiveTime(value: Date | string = new Date()): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  private formatLiveDateTime(value: Date | string = new Date()): string {
    const date = value instanceof Date ? value : new Date(value);
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    return safeDate.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  private addLiveLog(logItem: LiveLogItem): void {
    this.liveLogs.update(current => {
      const dedupedCurrent = logItem.type === 'resolved'
        ? current.filter((existing) => {
          return existing.type !== 'resolved'
            || Math.abs((existing.timestamp ?? 0) - (logItem.timestamp ?? 0)) > LIVE_RESOLVED_DEDUPE_WINDOW_MS;
        })
        : current;
      const updated = [logItem, ...dedupedCurrent];
      return updated.slice(0, 30);
    });
  }

  protected readonly liveChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#101010',
        titleFont: {
          family: 'Inter, sans-serif',
          size: 13,
          weight: '700',
        },
        bodyFont: {
          family: 'Inter, sans-serif',
          size: 13,
        },
        padding: 12,
        cornerRadius: 8,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            let label = 'Doanh thu: ';
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                maximumFractionDigits: 0,
              }).format(context.parsed.y);
            }
            return label;
          },
          afterBody: (context: any) => {
            const index = context[0].dataIndex;
            const point = this.livePoints[index];
            if (!point?.eventTitle) {
              return '';
            }
            const detailLines = [point.eventDateTime, point.eventDescription].filter(Boolean);
            return '\n' + [point.eventTitle, ...detailLines].join('\n');
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#64748B',
          font: {
            family: 'Inter, sans-serif',
            size: 12,
            weight: '700',
          },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
        },
      },
      y: {
        border: {
          dash: [5, 5],
        },
        grid: {
          color: 'rgba(229, 231, 235, 0.4)',
        },
        ticks: {
          color: '#64748B',
          font: {
            family: 'Inter, sans-serif',
            size: 12,
            weight: '700',
          },
          callback: (value: any) => {
            if (value >= 1000000) return (value / 1000000) + 'M';
            if (value >= 1000) return (value / 1000) + 'k';
            return value;
          },
        },
      },
    },
  };
}
