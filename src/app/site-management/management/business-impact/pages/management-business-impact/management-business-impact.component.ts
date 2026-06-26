import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { WebsocketService } from '../../../../../core/services/websocket.service';
import {
  LucideSparkles,
  LucideChevronRight,
  LucideX,
  LucideActivity,
  LucideUsers,
  LucideRotateCw,
  LucideFileText,
  LucideTrendingDown,
  LucideAlertTriangle,
  LucideHelpCircle,
  LucideClock,
  LucideShieldAlert,
  LucideLink,
  LucideSearch,
} from '@lucide/angular';
import { PaginatorModule } from 'primeng/paginator';
import { MarkdownComponent } from 'ngx-markdown';
import { ManagementBusinessImpactStore } from '../../data-access/store/management-business-impact.store';
import { ManagementIncidentImpactDto } from '../../data-access/models/management-business-impact.model';
import { IncidentSeverity, IncidentStatus } from '../../../../admin/data-access/models/admin.models';

function formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-management-business-impact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginatorModule,
    MarkdownComponent,
    LucideSparkles,
    LucideChevronRight,
    LucideX,
    LucideActivity,
    LucideUsers,
    LucideRotateCw,
    LucideFileText,
    LucideTrendingDown,
    LucideAlertTriangle,
    LucideHelpCircle,
    LucideClock,
    LucideShieldAlert,
    LucideLink,
    LucideSearch,
  ],
  templateUrl: './management-business-impact.component.html',
  styleUrl: './management-business-impact.component.css',
})
export class ManagementBusinessImpactComponent implements OnInit, OnDestroy {
  protected readonly store = inject(ManagementBusinessImpactStore);
  private readonly wsService = inject(WebsocketService);
  private wsSubscription: Subscription | null = null;
  
  // Local filter states
  protected readonly localSearch = signal<string>('');
  protected readonly selectedPreset = signal<string>('LAST_7_DAYS');
  protected readonly localStartDate = signal<string>(formatDateToYMD(new Date(Date.now() - 7 * 86400000)));
  protected readonly localEndDate = signal<string>(formatDateToYMD(new Date()));
  private readonly searchSubject = new Subject<string>();
  private searchSubscription: Subscription | null = null;
  
  // Tab hiện tại trong ngăn kéo chi tiết sự cố ('metrics' | 'users' | 'ai')
  protected readonly activeDetailTab = signal<'metrics' | 'users' | 'ai'>('metrics');
  
  // Trạng thái mở ngăn kéo chi tiết
  protected readonly isDrawerOpen = signal<boolean>(false);

  protected readonly IncidentSeverity = IncidentSeverity;
  protected readonly IncidentStatus = IncidentStatus;

  ngOnInit(): void {
    // Tải dữ liệu dashboard tổng quan và danh sách sự cố lần đầu
    this.store.loadDashboard();
    this.store.loadIncidents();

    // Thiết lập debounce tìm kiếm 300ms
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchValue => {
      this.applyFilters(searchValue, this.selectedPreset());
    });

    // Kết nối WebSocket và nhận cập nhật sự cố thời gian thực
    this.wsService.connect();
    this.wsSubscription = this.wsService.subscribe<any>('/topic/admin.incidents')
      .subscribe({
        next: (updatedIncident: any) => {
          this.store.loadDashboard();
          this.store.loadIncidents();

          const selected = this.store.selectedIncident();
          if (selected && updatedIncident && (updatedIncident.id === selected.incidentId || updatedIncident.incidentId === selected.incidentId)) {
            this.store.loadIncidentDetail(selected.incidentId);
            this.store.loadAffectedUsers(selected.incidentId);
          }
        },
        error: (err: any) => console.error('[Business Impact WS Error]', err)
      });
  }

  ngOnDestroy(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
      this.wsSubscription = null;
    }
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
      this.searchSubscription = null;
    }
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.localSearch.set(value);
    this.searchSubject.next(value);
  }

  protected onPresetChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedPreset.set(value);
    this.applyFilters(this.localSearch(), value);
  }

  protected onCustomStartDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.localStartDate.set(value);
    this.applyFilters(this.localSearch(), this.selectedPreset());
  }

  protected onCustomEndDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.localEndDate.set(value);
    this.applyFilters(this.localSearch(), this.selectedPreset());
  }

  private applyFilters(search: string, preset: string): void {
    let startDate: string | null = null;
    let endDate: string | null = null;
    const now = new Date();

    if (preset === 'TODAY') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      startDate = todayStart.toISOString();
      endDate = now.toISOString();
    } else if (preset === 'LAST_7_DAYS') {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      startDate = start.toISOString();
      endDate = now.toISOString();
    } else if (preset === 'LAST_30_DAYS') {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      startDate = start.toISOString();
      endDate = now.toISOString();
    } else if (preset === 'CUSTOM') {
      const startStr = this.localStartDate();
      const endStr = this.localEndDate();
      if (startStr) {
        const start = new Date(startStr);
        start.setHours(0, 0, 0, 0);
        startDate = start.toISOString();
      }
      if (endStr) {
        const end = new Date(endStr);
        end.setHours(23, 59, 59, 999);
        endDate = end.toISOString();
      }
    } else if (preset === 'ALL_TIME') {
      startDate = null;
      endDate = null;
    }

    this.store.updateFilters({
      search,
      datePreset: preset,
      startDate,
      endDate
    });

    // Load lại dữ liệu theo bộ lọc mới
    this.store.loadDashboard();
    this.store.loadIncidents();
  }

  protected onPageChange(event: any): void {
    // Cập nhật phân trang
    const newPage = event.page;
    const newSize = event.rows;
    this.store.updatePagination(newPage, newSize);
    this.store.loadIncidents();
  }

  protected openIncidentDetail(incident: ManagementIncidentImpactDto, tab: 'metrics' | 'users' | 'ai' = 'metrics'): void {
    this.store.setSelectedIncident(incident);
    this.activeDetailTab.set(tab);
    this.isDrawerOpen.set(true);
    // Tải thông tin chi tiết mới nhất của sự cố từ backend
    this.store.loadIncidentDetail(incident.incidentId);
    // Tải danh sách khách hàng bị ảnh hưởng chi tiết
    this.store.loadAffectedUsers(incident.incidentId);
  }

  protected closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.store.setSelectedIncident(null);
  }

  protected triggerAiAnalysis(incidentId: string): void {
    this.store.analyzeIncidentAi(incidentId);
  }

  protected refreshDashboard(): void {
    this.store.loadDashboard();
    this.store.loadIncidents();
  }

  protected formatVND(value: number | null | undefined): string {
    if (value === null || value === undefined) return '0 đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  protected getFriendlyErrorName(apiPath: string | null | undefined): string {
    if (!apiPath) return 'Lỗi hệ thống không xác định';
    const path = apiPath.toLowerCase();
    if (path.includes('/checkout')) return 'Lỗi đặt hàng & thanh toán (Checkout)';
    if (path.includes('/payments/momo')) return 'Lỗi cổng thanh toán MoMo';
    if (path.includes('/payments/vnpay')) return 'Lỗi cổng thanh toán VNPay';
    if (path.includes('/cart')) return 'Lỗi giỏ hàng (Cart API)';
    if (path.includes('/products')) return 'Lỗi xem danh mục & sản phẩm';
    if (path.includes('/login') || path.includes('/auth')) return 'Lỗi xác thực & đăng nhập';
    return 'Lỗi dịch vụ hệ thống';
  }

  protected getConfidenceScore(incident: ManagementIncidentImpactDto | null | undefined) {
    if (!incident) return { percentage: 0, label: 'N/A', colorClass: 'bg-gray-200 text-gray-700' };
    
    let score = 20; // base score
    if (incident.affectedUsers > 0) score += 30;
    if (incident.expectedOrders > 1) score += 30;
    if (incident.durationMinutes > 5) score += 20;

    const percentage = Math.min(score, 100);
    let label = 'LOW CONFIDENCE';
    let colorClass = 'text-rose-600 border-rose-100 bg-rose-50';
    if (percentage >= 90) {
      label = 'HIGH CONFIDENCE';
      colorClass = 'text-emerald-600 border-emerald-100 bg-emerald-50';
    } else if (percentage >= 60) {
      label = 'MEDIUM CONFIDENCE';
      colorClass = 'text-amber-600 border-amber-100 bg-amber-50';
    }

    return { percentage, label, colorClass };
  }

  protected getSeverityReasons(incident: ManagementIncidentImpactDto | null | undefined): string[] {
    if (!incident) return [];
    const reasons: string[] = [];
    
    if (incident.revenueLoss > 0) {
      reasons.push(`Thiệt hại doanh thu: ${this.formatVND(incident.revenueLoss)}`);
    }
    if (incident.lostOrders > 0) {
      reasons.push(`Đơn hàng bị mất: ${incident.lostOrders} đơn`);
    }
    if (incident.apiPath && (incident.apiPath.includes('/checkout') || incident.apiPath.includes('/payment'))) {
      reasons.push('Checkout Flow (Funnel Weight 100%)');
    }
    if (incident.statusCode) {
      reasons.push(`Ghi nhận HTTP ${incident.statusCode} tại Endpoint`);
    }
    
    return reasons;
  }

  protected getIncidentTimeline(incident: ManagementIncidentImpactDto | null | undefined) {
    if (!incident) return [];
    
    const baseTime = (incident.firstOccurredAt || incident.occurredAt) ? new Date(incident.firstOccurredAt || incident.occurredAt) : new Date();
    const formatTime = (date: Date, offsetMins: number) => {
      const targetDate = new Date(date.getTime() + offsetMins * 60000);
      const timeStr = targetDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const day = String(targetDate.getDate()).padStart(2, '0');
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      return `${timeStr} ${day}/${month}`;
    };

    return [
      { time: formatTime(baseTime, 0), desc: `Checkout API bắt đầu trả về HTTP ${incident.statusCode || 500}` },
      { time: formatTime(baseTime, 2), desc: 'Tỷ lệ lỗi (Error Rate) tăng lên 80%' },
      { time: formatTime(baseTime, 5), desc: 'Đơn hàng mua thành công bắt đầu giảm' },
      { time: formatTime(baseTime, 10), desc: `Doanh thu thất thoát bắt đầu phát sinh` },
      { time: formatTime(baseTime, 15), desc: `Sự cố ${incident.incidentCode} tự động được tạo` },
      { time: formatTime(baseTime, Math.max(16, incident.durationMinutes)), desc: incident.resolvedAt ? 'Sự cố được xử lý và khôi phục hoàn toàn' : 'Hệ thống tiếp tục giám sát tác động' }
    ];
  }

  protected getForecastDelta(incident: ManagementIncidentImpactDto | null | undefined) {
    if (!incident) return { revenueLossDelta: 0, lostOrdersDelta: 0, isSaturated: false };
    const factor = (incident.durationMinutes && incident.durationMinutes > 0) ? (60.0 / incident.durationMinutes) : 1.0;
    const revenueLossDelta = incident.revenueLoss * factor;
    const lostOrdersDelta = Math.round(incident.lostOrders * factor);
    const isSaturated = lostOrdersDelta === 0 && revenueLossDelta < 10000;
    return {
      revenueLossDelta,
      lostOrdersDelta,
      isSaturated
    };
  }

  protected getSimilarIncidents(incident: ManagementIncidentImpactDto | null | undefined): any[] {
    if (!incident) return [];
    return this.store.incidents()
      .filter(inc => inc.incidentId !== incident.incidentId && 
                     (inc.serviceName === incident.serviceName || inc.apiPath === incident.apiPath))
      .slice(0, 2)
      .map(inc => ({
        code: inc.incidentCode,
        apiPath: inc.apiPath,
        serviceName: inc.serviceName,
        revenueLoss: inc.revenueLoss,
        occurredAt: inc.firstOccurredAt || inc.occurredAt
      }));
  }

  protected parseAiSummary(aiSummary: string | null | undefined): Record<string, string> {
    const blocks: Record<string, string> = {
      tomTat: '',
      mucDo: '',
      nguyenNhan: '',
      chuyenDoi: '',
      thietHai: '',
      khachHang: '',
      deXuat: '',
      ketLuan: ''
    };

    if (!aiSummary) return blocks;

    const sections = [
      { key: 'tomTat', marker: '📊 Tóm tắt Thiệt hại Kinh doanh' },
      { key: 'mucDo', marker: '🎯 Đánh giá Mức độ Nghiêm trọng' },
      { key: 'nguyenNhan', marker: '🔍 Phân tích Nguyên nhân Gốc rễ' },
      { key: 'chuyenDoi', marker: '📈 Đánh giá Tác động Chuyển đổi' },
      { key: 'thietHai', marker: '💰 Đánh giá Thiệt hại Kinh doanh' },
      { key: 'khachHang', marker: '👥 Đánh giá Ảnh hưởng Khách hàng' },
      { key: 'deXuat', marker: '💡 Đề xuất Hành động Khắc phục' },
      { key: 'ketLuan', marker: '📌 Kết luận' }
    ];

    const indices = sections.map(sec => {
      const idx = aiSummary.indexOf(sec.marker);
      return { key: sec.key, idx, marker: sec.marker };
    }).filter(item => item.idx !== -1)
      .sort((a, b) => a.idx - b.idx);

    if (indices.length === 0) {
      blocks['tomTat'] = aiSummary;
      return blocks;
    }

    for (let i = 0; i < indices.length; i++) {
      const current = indices[i];
      const next = indices[i + 1];

      const startIdx = current.idx;
      let endIdx = aiSummary.length;
      if (next) {
        let headerStart = next.idx;
        while (headerStart > 0 && (aiSummary[headerStart - 1] === '#' || aiSummary[headerStart - 1] === ' ' || aiSummary[headerStart - 1] === '\n' || aiSummary[headerStart - 1] === '\r')) {
          headerStart--;
        }
        endIdx = headerStart;
      }

      let content = aiSummary.substring(startIdx, endIdx).trim();
      const newlineIdx = content.indexOf('\n');
      if (newlineIdx !== -1) {
        content = content.substring(newlineIdx).trim();
      } else {
        content = '';
      }

      blocks[current.key] = content;
    }

    return blocks;
  }

  protected getInitials(name: string | null | undefined): string {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '??';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  protected formatDuration(minutes: number | null | undefined): string {
    if (minutes === null || minutes === undefined) return '0 phút';
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} giờ`;
    return `${hours} giờ ${mins} phút`;
  }

  protected getActiveFunnelStep(apiPath: string | null | undefined): number {
    if (!apiPath) return 0;
    const path = apiPath.toLowerCase();
    if (path.includes('/payment') || path.includes('/momo') || path.includes('/vnpay')) return 4;
    if (path.includes('/checkout')) return 3;
    if (path.includes('/cart')) return 2;
    if (path.includes('/products') || path.includes('/categories')) return 1;
    return 0;
  }
}
