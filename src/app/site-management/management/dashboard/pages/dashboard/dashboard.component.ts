import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { DialogModule } from 'primeng/dialog';
import { DatePicker } from 'primeng/datepicker';
import { Subscription } from 'rxjs';
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
} from '@lucide/angular';
import { DashboardStore } from '../../data-access/store/dashboard.store';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { WebsocketService } from '../../../../../core/services/websocket.service';
import { ReportPeriod, IAIOpsInsight } from '../../../reports/data-access/models/reports.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChartModule,
    DialogModule,
    DatePicker,
    LucideCircleAlert,
    LucideEllipsisVertical,
    LucideTrendingUp,
    LucideCalendar,
    LucideArrowUpRight,
    LucideRefreshCw,
    LucideCheck,
    LucideAlertTriangle,
    LucideFileText,
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

  private readonly subscriptions: Subscription[] = [];

  // Live Operations Monitor State
  protected readonly liveLogs = signal<{ time: string; type: 'incident' | 'ticket' | 'resolved' | 'system'; message: string }[]>([]);
  protected readonly isSimulationRunning = signal<boolean>(false);
  protected readonly liveChartData = signal<any>({ labels: [], datasets: [] });
  protected activeLiveIncidentId: string | null = null;
  protected activeLiveTicketCode: string | null = null;

  private liveLabels: string[] = [];
  private liveRevenueValues: number[] = [];
  private livePointRadii: number[] = [];
  private livePointBgColors: string[] = [];
  private livePointStyles: string[] = [];
  private liveEventsHistory: (string | null)[] = [];
  
  private pendingLiveEvents: ('incident' | 'ticket' | 'resolved')[] = [];
  private liveTimerId: any = null;


  // Expose enum to template
  protected readonly ReportPeriod = ReportPeriod;

  // Custom date picker range model
  protected dateRange: Date[] | null = null;

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

  // Prioritize warning AIOps insights over info/success reports
  protected readonly activeInsight = computed(() => {
    const list = this.store.insights();
    const warning = list.find((x) => x.type === 'warning');
    if (warning) return warning;
    return list.length > 0 ? list[0] : null;
  });

  // Calculate AI Sales contribution amount
  protected readonly aiSalesRevenue = computed(() => {
    const totalRev = this.store.summary()?.totalRevenue ?? 0;
    const autoRate = this.store.summary()?.autoFulfillmentRate ?? 0;
    return (totalRev * autoRate) / 100;
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
    this.initLiveChart();
    this.liveTimerId = setInterval(() => this.tickLiveChart(), 4000);

    this.subscriptions.push(
      this.websocketService.subscribe<any>('/topic/admin.incidents').subscribe((payload) => {
        this.store.loadDashboardData({
          period: this.store.period(),
          startDate: this.store.customStartDate(),
          endDate: this.store.customEndDate(),
          silent: true,
        });
        
        if (payload) {
          const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          if (payload.status === 'RESOLVED') {
            this.activeLiveIncidentId = null;
            this.activeLiveTicketCode = null;
            this.pendingLiveEvents.push('resolved');
            this.addLiveLog({
              time,
              type: 'resolved',
              message: `✅ Sự cố [${payload.code || 'INC'}] đã được khắc phục. Doanh thu phục hồi.`
            });
            this.toast.success(`Khắc phục sự cố ${payload.code || 'INC'} thành công!`);
          } else {
            this.activeLiveIncidentId = payload.incidentId || payload.id;
            this.pendingLiveEvents.push('incident');
            this.addLiveLog({
              time,
              type: 'incident',
              message: `🚨 Phát hiện Sự cố [${payload.code || 'INC-NEW'}]: Dịch vụ ${this.getFriendlyServiceName(payload)} gặp gián đoạn!`
            });
            this.toast.error(`Phát hiện sự cố hệ thống ${payload.code || 'INC-NEW'}!`);
          }
        }
      })
    );

    this.subscriptions.push(
      this.websocketService.subscribe<any>('/topic/admin.tickets').subscribe((payload) => {
        this.store.loadDashboardData({
          period: this.store.period(),
          startDate: this.store.customStartDate(),
          endDate: this.store.customEndDate(),
          silent: true,
        });

        if (payload) {
          const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          if (payload.status === 'RESOLVED') {
            this.pendingLiveEvents.push('resolved');
            this.activeLiveIncidentId = null;
            this.activeLiveTicketCode = null;
            this.addLiveLog({
              time,
              type: 'resolved',
              message: `✅ Ticket [${payload.code || 'TCK'}] đã xử lý xong. Hệ thống hoạt động bình thường.`
            });
          } else {
            this.activeLiveTicketCode = payload.code;
            this.pendingLiveEvents.push('ticket');
            this.addLiveLog({
              time,
              type: 'ticket',
              message: `🔧 Đã tạo Ticket [${payload.code || 'TCK-NEW'}]: Giao cho kỹ thuật viên ${payload.assigneeName || 'chưa gán'}.`
            });
            this.toast.info(`Kỹ thuật viên bắt đầu xử lý Ticket ${payload.code || 'TCK-NEW'}.`);
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    if (this.liveTimerId) {
      clearInterval(this.liveTimerId);
    }
  }

  protected changePeriod(period: ReportPeriod): void {
    this.store.setPeriod(period);
    if (period !== ReportPeriod.Custom) {
      this.dateRange = null;
    }
  }

  protected onDateRangeChange(): void {
    if (this.dateRange && this.dateRange.length === 2 && this.dateRange[0] && this.dateRange[1]) {
      const start = this.dateRange[0].toISOString();
      const end = this.dateRange[1].toISOString();
      this.store.setCustomDates(start, end);
    }
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

  protected toggleAutopilot(): void {
    const nextState = !this.store.aiSalesModeActive();
    this.store.toggleAiSalesMode(nextState);
    if (nextState) {
      this.toast.success('Đã kích hoạt chế độ AI Autopilot: Tự động đền bù & chốt đơn.');
    } else {
      this.toast.warning('Đã chuyển sang chế độ AI Vận hành Thủ công (Manual Mode).');
    }
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

  protected confirmMitigateIncident(): void {
    const inc = this.store.selectedIncident();
    if (inc) {
      this.store.runAiIncidentMitigation(inc.incidentId);
      this.toast.success(`Đã kích hoạt khắc phục & đền bù tự động cho khách hàng bị ảnh hưởng bởi lỗi "${inc.incidentCode}"`);
    }
  }

  protected requestAiActionExecution(insight: IAIOpsInsight): void {
    this.store.setAiConfirmDialog(true, insight);
  }

  protected confirmAiAction(): void {
    const insight = this.store.selectedInsight();
    if (insight) {
      this.store.executeAiInsightAction(insight);
      this.toast.success(`Hệ thống đang triển khai đề xuất kinh doanh: "${insight.title}"`);
    }
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
    const now = new Date();
    for (let i = 15; i > 0; i--) {
      const timePoint = new Date(now.getTime() - i * 4000);
      const timeStr = timePoint.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.liveLabels.push(timeStr);
      const baseRev = 6000000 + Math.floor(Math.random() * 2000000);
      this.liveRevenueValues.push(baseRev);
      this.livePointRadii.push(2);
      this.livePointBgColors.push('#4F46E5');
      this.livePointStyles.push('circle');
      this.liveEventsHistory.push(null);
    }
    this.updateLiveChartReference();
    
    this.liveLogs.set([
      {
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'system',
        message: 'Hệ thống giám sát Live Ops đã khởi động thành công.'
      }
    ]);
  }

  private tickLiveChart(): void {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    let nextRev = 0;
    if (this.activeLiveIncidentId) {
      nextRev = 50000 + Math.floor(Math.random() * 250000);
    } else {
      nextRev = 6000000 + Math.floor(Math.random() * 2000000);
    }
    
    let radius = 2;
    let bgColor = '#4F46E5';
    let style = 'circle';
    let eventText: string | null = null;
    
    if (this.pendingLiveEvents.length > 0) {
      const ev = this.pendingLiveEvents.shift();
      if (ev === 'incident') {
        radius = 8;
        bgColor = '#E11D48';
        style = 'rectRot';
        eventText = `🚨 SỰ CỐ HỆ THỐNG: Doanh thu sụt giảm nghiêm trọng.`;
      } else if (ev === 'ticket') {
        radius = 8;
        bgColor = '#F59E0B';
        style = 'triangle';
        eventText = `🔧 TICKET XỬ LÝ: Kỹ thuật viên đang khắc phục sự cố.`;
      } else if (ev === 'resolved') {
        radius = 8;
        bgColor = '#10B981';
        style = 'rect';
        eventText = `✅ ĐÃ XỬ LÝ: Khôi phục hoạt động, doanh thu trở lại bình thường.`;
      }
    }
    
    this.liveLabels.push(timeStr);
    this.liveRevenueValues.push(nextRev);
    this.livePointRadii.push(radius);
    this.livePointBgColors.push(bgColor);
    this.livePointStyles.push(style);
    this.liveEventsHistory.push(eventText);
    
    if (this.liveLabels.length > 20) {
      this.liveLabels.shift();
      this.liveRevenueValues.shift();
      this.livePointRadii.shift();
      this.livePointBgColors.shift();
      this.livePointStyles.shift();
      this.liveEventsHistory.shift();
    }
    
    this.updateLiveChartReference();
  }

  private updateLiveChartReference(): void {
    this.liveChartData.set({
      labels: [...this.liveLabels],
      datasets: [
        {
          label: 'Doanh thu trực tiếp',
          data: [...this.liveRevenueValues],
          fill: true,
          borderColor: this.activeLiveIncidentId ? '#E11D48' : '#4F46E5',
          backgroundColor: this.activeLiveIncidentId ? 'rgba(225, 29, 72, 0.03)' : 'rgba(79, 70, 229, 0.03)',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: [...this.livePointRadii],
          pointHoverRadius: [...this.livePointRadii].map(r => r + 2),
          pointBackgroundColor: [...this.livePointBgColors],
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 1.5,
          pointStyle: [...this.livePointStyles]
        }
      ]
    });
  }

  private addLiveLog(logItem: { time: string; type: 'incident' | 'ticket' | 'resolved' | 'system'; message: string }): void {
    this.liveLogs.update(current => {
      const updated = [logItem, ...current];
      return updated.slice(0, 30);
    });
  }

  protected runDemoOutageSimulation(): void {
    if (this.isSimulationRunning()) return;
    this.isSimulationRunning.set(true);

    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.activeLiveIncidentId = 'INC-DEMO';
    this.pendingLiveEvents.push('incident');
    this.addLiveLog({
      time,
      type: 'incident',
      message: '🚨 [Giả lập] Phát hiện sự cố gián đoạn cổng thanh toán Checkout API!'
    });
    this.toast.error('Phát hiện sự cố hệ thống giả lập INC-DEMO!');

    setTimeout(() => {
      const time2 = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.activeLiveTicketCode = 'TCK-DEMO';
      this.pendingLiveEvents.push('ticket');
      this.addLiveLog({
        time: time2,
        type: 'ticket',
        message: '🔧 [Giả lập] Tạo Ticket [TCK-DEMO]: Giao cho kỹ thuật viên Yang Kook xử lý.'
      });
      this.toast.info('Kỹ thuật viên bắt đầu xử lý Ticket giả lập TCK-DEMO.');
    }, 12000);

    setTimeout(() => {
      const time3 = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.activeLiveIncidentId = null;
      this.activeLiveTicketCode = null;
      this.pendingLiveEvents.push('resolved');
      this.addLiveLog({
        time: time3,
        type: 'resolved',
        message: '✅ [Giả lập] Sự cố đã được xử lý xong. Tiến trình thanh toán khôi phục.'
      });
      this.toast.success('Xử lý sự cố giả lập thành công!');
      this.isSimulationRunning.set(false);
    }, 24000);
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
          size: 11,
          weight: '700',
        },
        bodyFont: {
          family: 'Inter, sans-serif',
          size: 11,
        },
        padding: 8,
        cornerRadius: 6,
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
            const event = this.liveEventsHistory[index];
            return event ? '\n' + event : '';
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
          color: '#9CA3AF',
          font: {
            family: 'Inter, sans-serif',
            size: 9,
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
          color: '#9CA3AF',
          font: {
            family: 'Inter, sans-serif',
            size: 9,
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
