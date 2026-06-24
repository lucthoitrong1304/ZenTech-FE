import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { DatePicker } from 'primeng/datepicker';
import {
  LucideActivity,
  LucideAlertTriangle,
  LucideCalendarDays,
  LucideCheckCircle2,
  LucideCircleHelp,
  LucideClock3,
  LucideCpu,
  LucideDatabase,
  LucideGauge,
  LucideNetwork,
  LucideRefreshCw,
  LucideServer,
  LucideZap,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { AdminDashboardService } from '../../../dashboard/data-access/dashboard.service';
import {
  AdminObservabilityData,
  DashboardPeriod,
  ObservabilityHistoryPoint,
} from '../../../dashboard/data-access/dashboard.models';

type MetricKey = keyof Pick<ObservabilityHistoryPoint,
  'cpuUsagePercent' | 'ramUsagePercent' | 'diskUsagePercent' | 'jvmHeapUsagePercent' |
  'requestsPerMinute' | 'errorRatePercent' | 'p95LatencyMs'>;

interface MetricDefinition {
  key: MetricKey;
  name: string;
  color: string;
  unit: '%' | 'req/min' | 'ms';
  threshold: number;
  description: string;
}

@Component({
  selector: 'app-resource-monitoring',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartModule, DatePicker, LucideActivity, LucideAlertTriangle,
    LucideCalendarDays, LucideCheckCircle2, LucideCircleHelp, LucideClock3, LucideCpu, LucideDatabase, LucideGauge,
    LucideNetwork, LucideRefreshCw, LucideServer, LucideZap],
  templateUrl: './resource-monitoring.component.html',
  styleUrl: './resource-monitoring.component.css',
})
export class ResourceMonitoringComponent implements OnInit, OnDestroy {
  private readonly service = inject(AdminDashboardService);
  private readonly route = inject(ActivatedRoute);

  protected readonly period = signal<DashboardPeriod>('7D');
  protected readonly data = signal<AdminObservabilityData | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedMetric = signal<MetricKey>('cpuUsagePercent');
  protected readonly refreshIn = signal(15);

  protected dateRange: Date[] | null = null;
  protected readonly maxDate = new Date();
  private customFrom?: string;
  private customTo?: string;
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly metrics: MetricDefinition[] = [
    { key: 'cpuUsagePercent', name: 'CPU toàn máy', color: '#eab308', unit: '%', threshold: 75, description: 'Mức xử lý mà toàn bộ máy chủ đang sử dụng.' },
    { key: 'ramUsagePercent', name: 'Bộ nhớ RAM', color: '#f97316', unit: '%', threshold: 75, description: 'Tỷ lệ bộ nhớ của toàn máy chủ đang được sử dụng.' },
    { key: 'diskUsagePercent', name: 'Ổ đĩa', color: '#4f46e5', unit: '%', threshold: 75, description: 'Tỷ lệ dung lượng phân vùng chứa ứng dụng đã sử dụng.' },
    { key: 'jvmHeapUsagePercent', name: 'Bộ nhớ Java', color: '#0ea5e9', unit: '%', threshold: 75, description: 'Phần bộ nhớ riêng mà ứng dụng backend Java đang sử dụng.' },
    { key: 'requestsPerMinute', name: 'Lưu lượng API', color: '#10b981', unit: 'req/min', threshold: 300, description: 'Số yêu cầu API backend nhận được trong một phút.' },
    { key: 'errorRatePercent', name: 'Tỷ lệ lỗi API', color: '#e11d48', unit: '%', threshold: 5, description: 'Phần trăm yêu cầu trả về lỗi HTTP 4xx hoặc 5xx.' },
    { key: 'p95LatencyMs', name: 'Độ trễ P95', color: '#8b5cf6', unit: 'ms', threshold: 1000, description: '95% yêu cầu API phản hồi nhanh hơn con số này.' },
  ];

  protected readonly selectedDefinition = computed(() =>
    this.metrics.find((metric) => metric.key === this.selectedMetric()) ?? this.metrics[0]);

  protected readonly chartData = computed(() => {
    const metric = this.selectedDefinition();
    const history = this.data()?.history ?? [];
    return {
      labels: history.map((point) => this.formatChartTime(point.timestamp)),
      datasets: [
        {
          label: metric.name,
          data: history.map((point) => point[metric.key]),
          borderColor: metric.color,
          backgroundColor: `${metric.color}16`,
          fill: true,
          borderWidth: 2.3,
          tension: 0.32,
          pointRadius: history.length > 60 ? 0 : 2,
          pointHoverRadius: 5,
          spanGaps: true,
        },
        {
          label: `Ngưỡng ${this.formatMetric(metric.threshold, metric.unit)}`,
          data: history.map(() => metric.threshold),
          borderColor: '#ef4444',
          borderDash: [6, 5],
          borderWidth: 1.4,
          pointRadius: 0,
          fill: false,
        },
      ],
    };
  });

  protected readonly chartOptions = computed(() => {
    const metric = this.selectedDefinition();
    const values = (this.data()?.history ?? [])
      .map((point) => point[metric.key])
      .filter((value): value is number => value != null);
    const maxValue = Math.max(metric.threshold, ...values, metric.unit === '%' ? 100 : 0);
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827', padding: 12, cornerRadius: 10,
          callbacks: { label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) =>
            `${context.dataset.label}: ${context.parsed.y == null ? 'N/A' : this.formatMetric(context.parsed.y, metric.unit)}` },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8', maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
        y: {
          beginAtZero: true,
          suggestedMax: metric.unit === '%' ? 100 : Math.ceil(maxValue * 1.15),
          max: metric.unit === '%' ? 100 : undefined,
          ticks: { color: '#94a3b8', callback: (value: number | string) => this.formatMetric(Number(value), metric.unit) },
          grid: { color: 'rgba(226,232,240,.75)' },
        },
      },
    };
  });

  ngOnInit(): void {
    const metricMap: Record<string, MetricKey> = { cpu: 'cpuUsagePercent', ram: 'ramUsagePercent', disk: 'diskUsagePercent' };
    const requested = this.route.snapshot.queryParamMap.get('metric');
    if (requested && metricMap[requested]) this.selectedMetric.set(metricMap[requested]);
    this.load();
    this.tickTimer = setInterval(() => {
      if (document.hidden) return;
      const next = this.refreshIn() - 1;
      if (next <= 0) this.load(true);
      else this.refreshIn.set(next);
    }, 1000);
  }

  ngOnDestroy(): void { if (this.tickTimer) clearInterval(this.tickTimer); }

  protected selectPeriod(period: Exclude<DashboardPeriod, 'CUSTOM'>): void {
    this.period.set(period); this.dateRange = null; this.customFrom = undefined; this.customTo = undefined; this.load();
  }

  protected onCustomRangeChange(): void {
    const [start, end] = this.dateRange ?? [];
    if (!start || !end) return;
    const from = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const to = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
    if (to.getTime() - from.getTime() > 90 * 86400000) {
      this.error.set('Khoảng thời gian tùy chọn tối đa là 90 ngày.'); this.dateRange = null; return;
    }
    if (to > this.maxDate) to.setTime(this.maxDate.getTime());
    this.period.set('CUSTOM'); this.customFrom = from.toISOString(); this.customTo = to.toISOString(); this.load();
  }

  protected refresh(): void { this.load(); }
  protected selectMetric(metric: MetricKey): void { this.selectedMetric.set(metric); }

  protected current(metric: MetricKey): number | null {
    const data = this.data();
    if (!data) return null;
    const map: Record<MetricKey, number | null> = {
      cpuUsagePercent: data.health.cpuUsagePercent,
      ramUsagePercent: data.health.ramUsagePercent,
      diskUsagePercent: data.health.diskUsagePercent,
      jvmHeapUsagePercent: data.health.jvmHeapUsagePercent,
      requestsPerMinute: data.api.requestsPerMinute,
      errorRatePercent: data.api.errorRatePercent,
      p95LatencyMs: data.api.p95LatencyMs,
    };
    return map[metric];
  }

  protected average(metric: MetricKey): number | null {
    const values = (this.data()?.history ?? []).map((point) => point[metric]).filter((v): v is number => v != null);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  protected maximum(metric: MetricKey): number | null {
    const values = (this.data()?.history ?? []).map((point) => point[metric]).filter((v): v is number => v != null);
    return values.length ? Math.max(...values) : null;
  }

  protected resourceTone(value: number | null, threshold = 75): 'normal' | 'warning' | 'critical' {
    if (value != null && value >= 90) return 'critical';
    if (value != null && value >= threshold) return 'warning';
    return 'normal';
  }

  protected formatMetric(value: number | null, unit: '%' | 'req/min' | 'ms'): string {
    if (value == null) return 'Chưa đủ dữ liệu';
    if (unit === 'ms') return `${value.toFixed(value >= 100 ? 0 : 1)} ms`;
    if (unit === 'req/min') return `${value.toFixed(1)} req/min`;
    return `${value.toFixed(1)}%`;
  }

  protected metricStatus(metric: MetricDefinition, value: number | null): 'unknown' | 'stable' | 'warning' | 'critical' {
    if (value == null) return 'unknown';
    if (metric.key === 'requestsPerMinute') return value >= metric.threshold ? 'warning' : 'stable';
    const criticalThreshold = metric.key === 'errorRatePercent' ? 15
      : metric.key === 'p95LatencyMs' ? 2500
      : 90;
    if (value >= criticalThreshold) return 'critical';
    return value >= metric.threshold ? 'warning' : 'stable';
  }

  protected metricStatusLabel(metric: MetricDefinition, value: number | null): string {
    const status = this.metricStatus(metric, value);
    if (status === 'unknown') return 'Chưa đủ dữ liệu';
    if (status === 'critical') return 'Nguy hiểm';
    if (status === 'warning') return metric.key === 'requestsPerMinute' ? 'Lưu lượng cao' : 'Cần chú ý';
    return 'Ổn định';
  }

  protected metricStatusClass(metric: MetricDefinition, value: number | null): string {
    return `metric-status metric-status--${this.metricStatus(metric, value)}`;
  }

  protected dependencyStatusLabel(status: string): string {
    if (status === 'UP') return 'Hoạt động tốt';
    if (status === 'DEGRADED') return 'Cần chú ý';
    return 'Mất kết nối';
  }

  protected dependencyValueLabel(value: number, unit: string | null): string {
    const labels: Record<string, string> = {
      active: 'đang dùng', pending: 'đang chờ', connections: 'kết nối', channels: 'kênh xử lý',
    };
    return `${value.toFixed(value % 1 === 0 ? 0 : 1)} ${labels[unit ?? ''] ?? unit ?? ''}`.trim();
  }

  protected runtimeHelp(type: 'uptime' | 'processCpu' | 'threads' | 'heap'): string {
    const help = {
      uptime: 'Thời gian backend Java đã chạy liên tục kể từ lần khởi động gần nhất.',
      processCpu: 'Phần CPU chỉ riêng ứng dụng backend Java đang sử dụng, khác với CPU toàn máy.',
      threads: 'Số luồng Java đang hoạt động và mức cao nhất đã ghi nhận.',
      heap: 'Dung lượng bộ nhớ Java đang dùng trên giới hạn tối đa được cấp.',
    };
    return help[type];
  }
  protected formatBytes(value: number | null | undefined): string {
    if (value == null) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB', 'TB']; let size = value; let unit = 0;
    while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++; }
    return `${size.toFixed(unit >= 3 ? 1 : 0)} ${units[unit]}`;
  }

  protected uptimeLabel(seconds: number | null | undefined): string {
    if (seconds == null) return 'Chưa có dữ liệu';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days} ngày ${hours} giờ`;
    if (hours > 0) return `${hours} giờ ${minutes} phút`;
    return `${Math.max(1, minutes)} phút`;
  }
  protected periodLabel(): string {
    return this.period() === 'TODAY' ? 'Hôm nay' : this.period() === '7D' ? '7 ngày qua' : this.period() === '30D' ? '30 ngày qua' : 'Khoảng tùy chọn';
  }

  protected historyRangeLabel(): string {
    const history = this.data()?.history ?? [];
    if (!history.length) return 'Chưa có dữ liệu lịch sử';
    return `Dữ liệu thực từ ${new Date(history[0].timestamp).toLocaleString('vi-VN')} đến ${new Date(history.at(-1)!.timestamp).toLocaleString('vi-VN')}`;
  }

  protected dependencyClass(status: string): string { return `dependency-card dependency-card--${status.toLowerCase()}`; }

  private load(silent = false): void {
    if (!silent) this.isLoading.set(true);
    this.error.set(null);
    this.service.getObservability(this.period(), this.customFrom, this.customTo)
      .pipe(finalize(() => { this.isLoading.set(false); this.refreshIn.set(15); }))
      .subscribe({ next: (response) => this.data.set(response.data), error: () => this.error.set('Không thể tải dữ liệu observability. Vui lòng thử lại.') });
  }

  private formatChartTime(timestamp: string): string {
    const date = new Date(timestamp);
    return this.period() === 'TODAY'
      ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }
}