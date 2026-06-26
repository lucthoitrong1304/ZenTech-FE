import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { DatePicker } from 'primeng/datepicker';
import {
  LucideActivity,
  LucideAlertCircle,
  LucideArrowRight,
  LucideCheckCircle,
  LucideLink,
  LucideRefreshCw,
  LucideServer,
  LucideUsers,
} from '@lucide/angular';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { WebsocketService } from '../../../../../core/services/websocket.service';
import { AdminStatisticsStore } from '../../data-access/statistics.store';
import { StatisticsPeriod } from '../../data-access/statistics.models';

@Component({
  selector: 'app-admin-statistics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChartModule,
    DatePicker,
    LucideActivity,
    LucideAlertCircle,
    LucideArrowRight,
    LucideCheckCircle,
    LucideLink,
    LucideRefreshCw,
    LucideServer,
    LucideUsers,
  ],
  providers: [AdminStatisticsStore],
  templateUrl: './statistics.component.html',
  styleUrl: './statistics.component.css',
})
export class StatisticsComponent implements OnInit, OnDestroy {
  protected readonly store = inject(AdminStatisticsStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly websocket = inject(WebsocketService);

  protected dateRange: Date[] | null = null;
  protected readonly maxDate = new Date();
  private readonly subscriptions: Subscription[] = [];
  private readonly refreshTrigger = new Subject<void>();
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  protected readonly hiddenChartSeries = signal<Set<'errors' | 'warnings'>>(new Set());

  protected readonly chartData = computed(() => {
    const trend = this.store.trend();
    const hidden = this.hiddenChartSeries();
    const datasets = [
      {
        key: 'errors' as const,
        label: 'Lỗi',
        data: trend.map((point) => point.errors),
        borderColor: '#e11d48',
        backgroundColor: 'rgba(225, 29, 72, 0.1)',
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
      {
        key: 'warnings' as const,
        label: 'Cảnh báo',
        data: trend.map((point) => point.warnings),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.04)',
        fill: false,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ]
      .filter((dataset) => !hidden.has(dataset.key))
      .map(({ key: _key, ...dataset }) => dataset);

    return {
      labels: trend.map((point) => point.label),
      datasets,
    };
  });
  protected readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827',
        padding: 12,
        cornerRadius: 10,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#64748b', precision: 0 },
        grid: { color: 'rgba(226, 232, 240, 0.75)' },
      },
    },
  };

  ngOnInit(): void {
    this.store.load({});
    this.refreshTrigger.pipe(debounceTime(700)).subscribe(() => this.store.refresh(true));
    this.websocket.connect();
    this.subscriptions.push(
      this.websocket.subscribe('/topic/admin.incidents').subscribe(() => this.refreshTrigger.next()),
      this.websocket.subscribe('/topic/admin.tickets').subscribe(() => this.refreshTrigger.next()),
    );
    this.refreshTimer = setInterval(() => this.store.refresh(true), 60_000);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.refreshTrigger.complete();
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  protected toggleChartSeries(series: 'errors' | 'warnings'): void {
    const hidden = new Set(this.hiddenChartSeries());
    if (hidden.has(series)) hidden.delete(series);
    else hidden.add(series);
    this.hiddenChartSeries.set(hidden);
  }

  protected isChartSeriesHidden(series: 'errors' | 'warnings'): boolean {
    return this.hiddenChartSeries().has(series);
  }
  protected selectPeriod(period: Exclude<StatisticsPeriod, 'CUSTOM'>): void {
    this.dateRange = null;
    this.store.setPeriod(period);
  }

  protected onCustomRangeChange(): void {
    const [start, end] = this.dateRange ?? [];
    if (!start || !end) return;
    const from = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
    const to = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
    if (to.getTime() - from.getTime() > 90 * 24 * 60 * 60 * 1000) {
      this.toast.warning('Khoảng thời gian tùy chọn tối đa là 90 ngày.');
      this.dateRange = null;
      return;
    }
    if (to > this.maxDate) to.setTime(this.maxDate.getTime());
    this.store.setCustomRange(from.toISOString(), to.toISOString());
  }

  protected refresh(): void {
    this.store.refresh();
    this.toast.success('Đang đồng bộ dữ liệu thống kê mới nhất.');
  }

  protected openApi(method: string, endpoint: string): void {
    this.router.navigate(['/admin/issues'], { queryParams: { search: `${method} ${endpoint}` } });
  }

  protected openService(service: string): void {
    this.router.navigate(['/admin/issues'], { queryParams: { service } });
  }

  protected openUser(userId: string | null, email: string | null): void {
    if (!userId && !email) return;
    this.router.navigate(['/admin/accounts'], { queryParams: { accountId: userId, keyword: email } });
  }

  protected avatarFailed(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  protected initials(name: string | null | undefined): string {
    const value = name?.trim() || '?';
    return value
      .split(/\s+/)
      .slice(-2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  protected periodLabel(): string {
    if (this.store.period() === 'TODAY') return 'Hôm nay';
    if (this.store.period() === '7D') return '7 ngày qua';
    if (this.store.period() === '30D') return '30 ngày qua';
    return 'Khoảng tùy chọn';
  }

  protected totalWarnings(): number {
    return this.store.trend().reduce((total, point) => total + point.warnings, 0);
  }
  protected relativeTime(value: string | null | undefined): string {
    if (!value) return 'Chưa rõ';
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  }
}
