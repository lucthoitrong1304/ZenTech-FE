import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { DatePicker } from 'primeng/datepicker';
import {
  LucideActivity,
  LucideAlertTriangle,
  LucideArrowRight,
  LucideCalendarDays,
  LucideCircleAlert,
  LucideCpu,
  LucideDatabase,
  LucideGauge,
  LucideRefreshCw,
  LucideServer,
  LucideShieldCheck,
  LucideTicket,
} from '@lucide/angular';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { WebsocketService } from '../../../../../core/services/websocket.service';
import { AdminDashboardStore } from '../../data-access/dashboard.store';
import { DashboardPeriod } from '../../data-access/dashboard.models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ChartModule,
    DatePicker,
    LucideActivity,
    LucideAlertTriangle,
    LucideArrowRight,
    LucideCalendarDays,
    LucideCircleAlert,
    LucideCpu,
    LucideDatabase,
    LucideGauge,
    LucideRefreshCw,
    LucideServer,
    LucideShieldCheck,
    LucideTicket,
  ],
  providers: [AdminDashboardStore],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  protected readonly store = inject(AdminDashboardStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly websocket = inject(WebsocketService);
  private readonly destroyRef = inject(DestroyRef);

  protected dateRange: Date[] | null = null;
  protected readonly maxDate = new Date();
  private readonly refreshTrigger = new Subject<void>();
  private readonly subscriptions: Subscription[] = [];
  private overviewTimer: ReturnType<typeof setInterval> | null = null;
  private resourceTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly chartData = computed(() => {
    const trend = this.store.trend();
    return {
      labels: trend.map((point) => point.label),
      datasets: [
        {
          label: 'Issues',
          data: trend.map((point) => point.issues),
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
        {
          label: 'Incidents mới',
          data: trend.map((point) => point.incidentsCreated),
          borderColor: '#E11D48',
          backgroundColor: 'rgba(225, 29, 72, 0.04)',
          fill: false,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
        {
          label: 'Đã xử lý',
          data: trend.map((point) => point.incidentsResolved),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.04)',
          fill: false,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
      ],
    };
  });

  protected readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          color: '#475569',
          font: { family: 'Inter, sans-serif', size: 11, weight: '600' },
        },
      },
      tooltip: {
        backgroundColor: '#111827',
        padding: 12,
        cornerRadius: 10,
        titleFont: { family: 'Inter, sans-serif', size: 12, weight: '700' },
        bodyFont: { family: 'Inter, sans-serif', size: 12 },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94A3B8', maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#94A3B8', precision: 0 },
        grid: { color: 'rgba(226, 232, 240, 0.7)' },
      },
    },
  };

  ngOnInit(): void {
    this.store.loadDashboard({});
    this.store.loadResources();

    this.refreshTrigger
      .pipe(debounceTime(600), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.store.loadDashboard({ silent: true }));

    this.websocket.connect();
    this.subscriptions.push(
      this.websocket.subscribe('/topic/admin.incidents').subscribe(() => this.refreshTrigger.next()),
      this.websocket.subscribe('/topic/admin.tickets').subscribe(() => this.refreshTrigger.next()),
      this.websocket.subscribe('/topic/admin.logs').subscribe(() => this.refreshTrigger.next()),
    );

    this.overviewTimer = setInterval(() => this.store.loadDashboard({ silent: true }), 60_000);
    this.resourceTimer = setInterval(() => this.store.loadResources(), 15_000);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    if (this.overviewTimer) clearInterval(this.overviewTimer);
    if (this.resourceTimer) clearInterval(this.resourceTimer);
  }

  protected selectPeriod(period: Exclude<DashboardPeriod, 'CUSTOM'>): void {
    this.dateRange = null;
    this.store.setPeriod(period);
  }

  protected onCustomRangeChange(): void {
    const [start, end] = this.dateRange ?? [];
    if (!start || !end) return;

    const from = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
    const to = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
    const maxRangeMs = 90 * 24 * 60 * 60 * 1000;
    if (to.getTime() - from.getTime() > maxRangeMs) {
      this.toast.warning('Khoảng thời gian tùy chọn tối đa là 90 ngày.');
      this.dateRange = null;
      return;
    }
    if (to > this.maxDate) to.setTime(this.maxDate.getTime());
    this.store.setCustomRange(from.toISOString(), to.toISOString());
  }

  protected refresh(): void {
    this.store.refreshAll();
    this.toast.success('Đang đồng bộ dữ liệu Dashboard mới nhất.');
  }

  protected scrollToQueues(): void {
    document.getElementById('dashboard-priority-queues')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  protected openIssue(_signature: string): void {
    this.router.navigate(['/admin/issues']);
  }

  protected openIncident(id: string): void {
    this.router.navigate(['/admin/incidents', id]);
  }

  protected openTicket(_code: string): void {
    this.router.navigate(['/admin/tickets']);
  }

  protected healthTitle(): string {
    if (this.store.health() === 'CRITICAL') return 'Hệ thống cần xử lý ngay';
    if (this.store.health() === 'DEGRADED') return 'Có tín hiệu cần theo dõi';
    return 'Hệ thống đang vận hành ổn định';
  }

  protected healthDescription(): string {
    const metrics = this.store.metrics();
    if (!metrics) return 'Đang tổng hợp tín hiệu vận hành mới nhất.';
    if (this.store.health() === 'CRITICAL') {
      return `${metrics.highPriorityIncidents} sự cố mức cao hoặc nghiêm trọng đang cần ưu tiên.`;
    }
    if (this.store.health() === 'DEGRADED') {
      return `${metrics.issuesInPeriod} issues trong kỳ · ${metrics.openIncidents} incidents mở · ${metrics.actionableTickets} tickets cần xử lý.`;
    }
    return 'Không có incident hoặc ticket tồn đọng cần can thiệp.';
  }

  protected periodLabel(): string {
    const period = this.store.period();
    if (period === 'TODAY') return 'Hôm nay';
    if (period === '7D') return '7 ngày qua';
    if (period === '30D') return '30 ngày qua';
    return 'Khoảng tùy chọn';
  }

  protected resourceValue(value: number | null | undefined): string {
    return value == null ? 'N/A' : `${Math.round(value)}%`;
  }

  protected resourceTone(value: number | null | undefined): 'normal' | 'warning' | 'critical' {
    if (value != null && value >= 90) return 'critical';
    if (value != null && value >= 75) return 'warning';
    return 'normal';
  }

  protected resourceWidth(value: number | null | undefined): number {
    return value == null ? 0 : Math.min(100, Math.max(0, value));
  }

  protected formatBytes(value: number | null | undefined): string {
    if (value == null) return 'Không khả dụng';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = value;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit++;
    }
    return `${size.toFixed(unit >= 3 ? 1 : 0)} ${units[unit]}`;
  }

  protected ageLabel(value: string | null | undefined): string {
    if (!value) return 'Chưa rõ thời gian';
    const diffMs = Math.max(0, Date.now() - new Date(value).getTime());
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  }
}