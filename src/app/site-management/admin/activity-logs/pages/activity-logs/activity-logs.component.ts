import { Component, NgZone, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideChevronLeft, LucideChevronRight, LucideSearch, LucideX } from '@lucide/angular';
import { Subscription } from 'rxjs';
import { AdminStore } from '../../../data-access/store/admin.store';
import { ActivityArea, ActivityLog, ActivitySeverity } from '../../../data-access/models/admin.models';
import { WebsocketService } from '../../../../../core/services/websocket.service';

type ActivityFilter = 'ALL' | string;

interface BrowserInfo {
  browser: string;
  browserIcon: string;
  browserIconClass: string;
  os: string;
  osIcon: string;
  osIconClass: string;
  device: string;
  deviceIcon: string;
  deviceIconClass: string;
  engine: string;
  raw: string;
}

@Component({
  selector: 'app-admin-activity-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideSearch,
    LucideChevronLeft,
    LucideChevronRight,
    LucideX
  ],
  templateUrl: './activity-logs.component.html',
  styleUrl: './activity-logs.component.css'
})
export class ActivityLogsComponent implements OnInit, OnDestroy {
  protected readonly store = inject(AdminStore);
  private readonly wsService = inject(WebsocketService);
  private readonly ngZone = inject(NgZone);
  protected readonly searchText = signal('');
  protected readonly selectedLog = signal<ActivityLog | null>(null);
  protected readonly pendingRealtimeCount = signal(0);

  protected readonly areaOptions = Object.values(ActivityArea);
  protected readonly severityOptions = Object.values(ActivitySeverity);

  protected readonly moduleOptions = computed(() => {
    return this.store.activityModulesList();
  });

  protected readonly actionOptions = computed(() => {
    return this.store.activityActionsList();
  });

  protected readonly displayedActivityLogs = computed(() => {
    return this.store.filteredActivityLogs();
  });

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private wsSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.searchText.set(this.store.activitySearch());
    this.store.loadActivityLogMetadata();
    this.store.loadActivityLogs({
      page: this.store.activityPage(),
      size: this.store.activitySize(),
      search: this.store.activitySearch(),
      area: this.store.activityArea(),
      severity: this.store.activitySeverity(),
      module: this.store.activityModule(),
      action: this.store.activityAction()
    });
    this.startRealtimeActivityLogs();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.stopRealtimeActivityLogs();
  }

  protected handleSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.store.setActivitySearch(value);
    }, 350);
  }

  protected changeAreaFilter(value: string): void {
    this.store.setActivityArea(value);
    this.pendingRealtimeCount.set(0);
  }

  protected changeSeverityFilter(value: string): void {
    this.store.setActivitySeverity(value);
    this.pendingRealtimeCount.set(0);
  }

  protected changeActionFilter(value: string): void {
    this.store.setActivityAction(value);
    this.pendingRealtimeCount.set(0);
  }

  protected changeModuleFilter(value: string): void {
    this.store.setActivityModule(value);
    this.pendingRealtimeCount.set(0);
  }

  protected changePage(page: number): void {
    const maxPage = this.totalPages;
    if (page >= 0 && page < maxPage) {
      this.store.setActivityPage(page);
      this.pendingRealtimeCount.set(0);
    }
  }

  protected changeSize(event: Event): void {
    const size = parseInt((event.target as HTMLSelectElement).value, 10);
    this.store.setActivitySize(size);
    this.pendingRealtimeCount.set(0);
  }

  protected refreshRealtimeLogs(): void {
    this.pendingRealtimeCount.set(0);
    this.store.loadActivityLogs({
      page: this.store.activityPage(),
      size: this.store.activitySize(),
      search: this.store.activitySearch(),
      area: this.store.activityArea(),
      severity: this.store.activitySeverity(),
      module: this.store.activityModule(),
      action: this.store.activityAction()
    });
  }

  protected openDetail(log: ActivityLog): void {
    this.selectedLog.set(log);
  }

  protected closeDetail(): void {
    this.selectedLog.set(null);
  }

  protected getInitials(fullName: string): string {
    if (!fullName) return 'AN';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  protected areaLabel(area?: string): string {
    const labels: Record<string, string> = {
      CUSTOMER: 'Mua hàng',
      MANAGEMENT: 'Nội bộ',
      ADMIN: 'Admin',
      SYSTEM: 'Hệ thống'
    };
    return labels[area || ''] || 'Khác';
  }

  protected severityLabel(severity?: string): string {
    const labels: Record<string, string> = {
      INFO: 'Thông tin',
      IMPORTANT: 'Quan trọng',
      SECURITY: 'Bảo mật',
      CRITICAL: 'Nghiêm trọng'
    };
    return labels[severity || ''] || 'Thông tin';
  }

  protected actionLabel(log: ActivityLog): string {
    return this.actionNameLabel(log.action, log.actionLabel);
  }

  protected actionNameLabel(action: string, fallback?: string): string {
    const labels: Record<string, string> = {
      LOGIN: 'Đăng nhập',
      LOGIN_FAILED: 'Đăng nhập thất bại',
      LOGOUT: 'Đăng xuất',
      PASSWORD_CHANGED: 'Đổi mật khẩu',
      CREATE_ACCOUNT: 'Tạo tài khoản',
      UPDATE_ACCOUNT: 'Cập nhật tài khoản',
      DELETE_ACCOUNT: 'Xóa tài khoản',
      LOCK_ACCOUNT: 'Khóa tài khoản',
      UNLOCK_ACCOUNT: 'Mở khóa tài khoản',
      CHANGE_ROLE: 'Đổi vai trò',
      CHANGE_PERMISSION: 'Đổi phân quyền',
      CHECKOUT_COMPLETED: 'Đặt hàng thành công',
      CHECKOUT_FAILED: 'Đặt hàng thất bại',
      PAYMENT_COMPLETED: 'Thanh toán thành công',
      PAYMENT_FAILED: 'Thanh toán thất bại',
      CREATE_PRODUCT: 'Tạo sản phẩm',
      UPDATE_PRODUCT: 'Cập nhật sản phẩm',
      DELETE_PRODUCT: 'Xóa sản phẩm',
      UPDATE_PRICE: 'Cập nhật giá',
      UPDATE_STOCK: 'Cập nhật tồn kho',
      IMPORT_STOCK: 'Nhập kho',
      EXPORT_STOCK: 'Xuất kho',
      UPDATE_ORDER_STATUS: 'Cập nhật đơn hàng',
      CANCEL_ORDER: 'Hủy đơn hàng',
      CREATE_COUPON: 'Tạo mã giảm giá',
      UPDATE_COUPON: 'Cập nhật mã giảm giá',
      DELETE_COUPON: 'Xóa mã giảm giá',
      ISSUE_VOUCHER: 'Phát voucher',
      REVOKE_VOUCHER: 'Thu hồi voucher',
      VIEW_LOG_DETAIL: 'Xem chi tiết log',
      CLEAR_LOG: 'Xóa log hiển thị',
      ARCHIVE_LOG: 'Lưu trữ log',
      CREATE_INCIDENT: 'Tạo sự cố',
      UPDATE_INCIDENT: 'Cập nhật sự cố',
      RESOLVE_INCIDENT: 'Xử lý sự cố',
      CREATE_PRODUCT_GROUP: 'Tạo nhóm sản phẩm',
      UPDATE_PRODUCT_GROUP: 'Cập nhật nhóm sản phẩm',
      DELETE_PRODUCT_GROUP: 'Xóa nhóm sản phẩm',
      CREATE_AI_AGENT: 'Tạo AI agent',
      UPDATE_AI_AGENT: 'Cập nhật AI agent',
      DELETE_AI_AGENT: 'Xóa AI agent',
      CHANGE_AI_AGENT_ROLE: 'Thay đổi vai trò AI agent',
      CREATE_AI_DATASET: 'Tạo bộ dữ liệu AI',
      UPDATE_AI_DATASET: 'Cập nhật bộ dữ liệu AI',
      DELETE_AI_DATASET: 'Xóa bộ dữ liệu AI',
      UPLOAD_AI_DOCUMENT: 'Tải lên tài liệu AI',
      DELETE_AI_DOCUMENT: 'Xóa tài liệu AI'
    };
    return labels[action] || fallback || this.toTitleCase(action);
  }

  protected targetLabel(log: ActivityLog): string {
    if ((log.action === 'LOGIN' || log.action === 'LOGOUT' || log.action === 'LOGIN_FAILED') && log.operatorEmail) {
      return log.targetLabel && log.targetLabel !== 'ACCOUNT' ? log.targetLabel : log.operatorEmail;
    }
    return log.targetLabel || log.target || log.targetId || log.targetType || 'N/A';
  }

  protected summary(log: ActivityLog): string {
    return this.formatSentence(this.translateSummary(log.summary || log.target || 'Không có tóm tắt'));
  }

  protected prettyMetadata(metadata?: string): string {
    if (!metadata) {
      return 'N/A';
    }
    try {
      return JSON.stringify(JSON.parse(metadata), null, 2);
    } catch {
      return metadata;
    }
  }

  protected browserInfo(userAgent?: string): BrowserInfo {
    const raw = userAgent?.trim() || 'N/A';
    if (!userAgent || userAgent === 'unknown') {
      return {
        browser: 'Không xác định',
        browserIcon: '?',
        browserIconClass: 'brand-icon--unknown',
        os: 'Không xác định',
        osIcon: '?',
        osIconClass: 'brand-icon--unknown',
        device: 'Không xác định',
        deviceIcon: '?',
        deviceIconClass: 'brand-icon--unknown',
        engine: 'Không xác định',
        raw
      };
    }

    const browser = this.detectBrowser(userAgent);
    const os = this.detectOperatingSystem(userAgent);
    const device = this.detectDevice(userAgent);

    return {
      browser,
      browserIcon: this.browserIconText(browser),
      browserIconClass: this.browserIconClass(browser),
      os,
      osIcon: this.osIconText(os),
      osIconClass: this.osIconClass(os),
      device,
      deviceIcon: this.deviceIconText(device),
      deviceIconClass: this.deviceIconClass(device),
      engine: this.detectEngine(userAgent),
      raw
    };
  }

  protected get totalPages(): number {
    const total = this.store.totalActivityLogs();
    const size = this.store.activitySize();
    return total > 0 ? Math.ceil(total / size) : 1;
  }

  protected get startRecordIndex(): number {
    const total = this.store.totalActivityLogs();
    if (total === 0) return 0;
    return this.store.activityPage() * this.store.activitySize() + 1;
  }

  protected get endRecordIndex(): number {
    const end = (this.store.activityPage() + 1) * this.store.activitySize();
    const total = this.store.totalActivityLogs();
    return end > total ? total : end;
  }

  private matchesFilter(filter: ActivityFilter, value?: string): boolean {
    return filter === 'ALL' || value === filter;
  }

  private startRealtimeActivityLogs(): void {
    this.stopRealtimeActivityLogs();
    this.wsService.connect();
    this.wsSubscription = this.wsService.subscribe<ActivityLog>('/topic/admin.activity-logs')
      .subscribe({
        next: (logItem) => {
          this.ngZone.run(() => this.handleRealtimeActivityLog(logItem));
        },
        error: (err) => {
          console.error('[Activity Logs WS Subscription Error]', err);
        }
      });
  }

  private stopRealtimeActivityLogs(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
      this.wsSubscription = null;
    }
  }

  private handleRealtimeActivityLog(logItem: ActivityLog): void {
    const normalizedLog: ActivityLog = {
      ...logItem,
      timestamp: new Date(logItem.timestamp)
    };

    if (this.shouldPrependRealtimeLog(normalizedLog)) {
      this.store.prependRealtimeActivityLog(normalizedLog);
      this.pendingRealtimeCount.set(0);
      return;
    }

    this.pendingRealtimeCount.update(count => count + 1);
  }

  private shouldPrependRealtimeLog(log: ActivityLog): boolean {
    return this.store.activityPage() === 0
      && this.matchesSearch(log)
      && this.matchesFilter(this.store.activityArea(), log.area)
      && this.matchesFilter(this.store.activitySeverity(), log.severity)
      && this.matchesFilter(this.store.activityAction(), log.action)
      && this.matchesFilter(this.store.activityModule(), log.module);
  }

  private matchesSearch(log: ActivityLog): boolean {
    const search = this.store.activitySearch().toLowerCase().trim();
    if (!search) {
      return true;
    }

    return [
      log.operatorEmail,
      log.operatorFullName,
      log.action,
      log.actionLabel,
      log.area,
      log.severity,
      log.module,
      log.targetType,
      log.targetId,
      log.targetLabel,
      log.target,
      log.summary,
      log.ipAddress
    ].some(value => (value || '').toString().toLowerCase().includes(search));
  }

  private toTitleCase(value: string): string {
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  private detectBrowser(userAgent: string): string {
    const rules: Array<[RegExp, string]> = [
      [/Edg\/([\d.]+)/, 'Microsoft Edge'],
      [/OPR\/([\d.]+)/, 'Opera'],
      [/Chrome\/([\d.]+)/, 'Google Chrome'],
      [/Firefox\/([\d.]+)/, 'Mozilla Firefox'],
      [/Version\/([\d.]+).*Safari/, 'Safari']
    ];

    for (const [regex, name] of rules) {
      const match = userAgent.match(regex);
      if (match?.[1]) {
        return `${name} ${this.majorVersion(match[1])}`;
      }
    }
    return 'Trình duyệt khác';
  }

  private detectOperatingSystem(userAgent: string): string {
    if (/Windows NT 10\.0/i.test(userAgent)) return 'Windows 10/11';
    if (/Windows NT 6\.3/i.test(userAgent)) return 'Windows 8.1';
    if (/Windows NT 6\.2/i.test(userAgent)) return 'Windows 8';
    if (/Windows NT 6\.1/i.test(userAgent)) return 'Windows 7';
    if (/Android/i.test(userAgent)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS / iPadOS';
    if (/Mac OS X/i.test(userAgent)) return 'macOS';
    if (/Linux/i.test(userAgent)) return 'Linux';
    return 'Hệ điều hành khác';
  }

  private detectDevice(userAgent: string): string {
    if (/iPad|Tablet/i.test(userAgent)) return 'Tablet';
    if (/Mobile|iPhone|Android/i.test(userAgent)) return 'Mobile';
    return 'Desktop';
  }

  private detectEngine(userAgent: string): string {
    const engineMatch = userAgent.match(/AppleWebKit\/([\d.]+)/);
    if (engineMatch?.[1]) return `AppleWebKit ${this.majorVersion(engineMatch[1])}`;
    const geckoMatch = userAgent.match(/Gecko\/([\d.]+)/);
    if (geckoMatch?.[1]) return `Gecko ${this.majorVersion(geckoMatch[1])}`;
    return 'Không xác định';
  }

  private browserIconText(browser: string): string {
    if (browser.includes('Chrome')) return 'C';
    if (browser.includes('Edge')) return 'E';
    if (browser.includes('Firefox')) return 'F';
    if (browser.includes('Safari')) return 'S';
    if (browser.includes('Opera')) return 'O';
    return '?';
  }

  private browserIconClass(browser: string): string {
    if (browser.includes('Chrome')) return 'brand-icon--chrome';
    if (browser.includes('Edge')) return 'brand-icon--edge';
    if (browser.includes('Firefox')) return 'brand-icon--firefox';
    if (browser.includes('Safari')) return 'brand-icon--safari';
    if (browser.includes('Opera')) return 'brand-icon--opera';
    return 'brand-icon--unknown';
  }

  private osIconText(os: string): string {
    if (os.includes('Windows')) return 'W';
    if (os.includes('macOS')) return 'M';
    if (os.includes('iOS')) return 'i';
    if (os.includes('Android')) return 'A';
    if (os.includes('Linux')) return 'L';
    return '?';
  }

  private osIconClass(os: string): string {
    if (os.includes('Windows')) return 'brand-icon--windows';
    if (os.includes('macOS') || os.includes('iOS')) return 'brand-icon--apple';
    if (os.includes('Android')) return 'brand-icon--android';
    if (os.includes('Linux')) return 'brand-icon--linux';
    return 'brand-icon--unknown';
  }

  private deviceIconText(device: string): string {
    if (device === 'Desktop') return 'PC';
    if (device === 'Mobile') return 'M';
    if (device === 'Tablet') return 'T';
    return '?';
  }

  private deviceIconClass(device: string): string {
    if (device === 'Desktop') return 'brand-icon--desktop';
    if (device === 'Mobile') return 'brand-icon--mobile';
    if (device === 'Tablet') return 'brand-icon--tablet';
    return 'brand-icon--unknown';
  }

  private majorVersion(version: string): string {
    return version.split('.')[0] || version;
  }

  private translateSummary(value: string): string {
    return value
      .replace(/\bCap nhat trang thai don hang\b/gi, 'cập nhật trạng thái đơn hàng')
      .replace(/\bCap nhat don hang\b/gi, 'cập nhật đơn hàng')
      .replace(/\bDieu chinh ton kho\b/gi, 'điều chỉnh tồn kho')
      .replace(/\bCap nhat ton kho\b/gi, 'cập nhật tồn kho')
      .replace(/\bCap nhat san pham\b/gi, 'cập nhật sản phẩm')
      .replace(/\bCap nhat tai khoan\b/gi, 'cập nhật tài khoản')
      .replace(/\bCap nhat ma giam gia\b/gi, 'cập nhật mã giảm giá')
      .replace(/\bTao tai khoan\b/gi, 'tạo tài khoản')
      .replace(/\bTao san pham\b/gi, 'tạo sản phẩm')
      .replace(/\bTao ma giam gia\b/gi, 'tạo mã giảm giá')
      .replace(/\bXoa tai khoan\b/gi, 'xóa tài khoản')
      .replace(/\bXoa san pham\b/gi, 'xóa sản phẩm')
      .replace(/\bXoa ma giam gia\b/gi, 'xóa mã giảm giá')
      .replace(/\bHuy don hang\b/gi, 'hủy đơn hàng')
      .replace(/\bKhach hang dat hang\b/gi, 'khách hàng đặt hàng')
      .replace(/\bAdmin thay doi vai tro tai khoan\b/gi, 'admin thay đổi vai trò tài khoản')
      .replace(/\bAdmin cap nhat trang thai tai khoan\b/gi, 'admin cập nhật trạng thái tài khoản')
      .replace(/\bAdmin tao tai khoan noi bo\b/gi, 'admin tạo tài khoản nội bộ')
      .replace(/\bAdmin xem chi tiet log\b/gi, 'admin xem chi tiết log')
      .replace(/\bAdmin xoa danh sach log dang hien thi\b/gi, 'admin xóa danh sách log đang hiển thị')
      .replace(/\bcap nhat\b/gi, 'cập nhật')
      .replace(/\bdang ky\b/gi, 'đăng ký')
      .replace(/\bbat\/tat\b/gi, 'bật/tắt')
      .replace(/\bcua\b/gi, 'của')
      .replace(/\btrang thai\b/gi, 'trạng thái')
      .replace(/\bdon hang\b/gi, 'đơn hàng')
      .replace(/\bton kho\b/gi, 'tồn kho')
      .replace(/\bsan pham\b/gi, 'sản phẩm')
      .replace(/\bma giam gia\b/gi, 'mã giảm giá')
      .replace(/\bnoi bo\b/gi, 'nội bộ')
      .replace(/\bchi tiet\b/gi, 'chi tiết')
      .replace(/\bdanh sach\b/gi, 'danh sách')
      .replace(/\bdang hien thi\b/gi, 'đang hiển thị')
      .replace(/\bdang nhap Google\b/gi, 'đăng nhập Google')
      .replace(/\bdang nhap he thong\b/gi, 'đăng nhập hệ thống')
      .replace(/\bdang xuat he thong\b/gi, 'đăng xuất hệ thống')
      .replace(/\bdang nhap\b/gi, 'đăng nhập')
      .replace(/\bdang xuat\b/gi, 'đăng xuất')
      .replace(/\bdoi mat khau\b/gi, 'đổi mật khẩu')
      .replace(/\bkhach hang\b/gi, 'khách hàng')
      .replace(/\btai khoan\b/gi, 'tài khoản');
  }

  private formatSentence(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return trimmed;
    }
    return trimmed.charAt(0).toLocaleUpperCase('vi-VN') + trimmed.slice(1);
  }
}
