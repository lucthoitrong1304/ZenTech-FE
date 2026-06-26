import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideEye,
  LucideRotateCcw,
  LucideSearch,
  LucideUser,
  LucideX,
} from '@lucide/angular';
import { SelectModule } from 'primeng/select';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CustomerService } from '../../../customers/data-access/services/customer.service';
import { ManagementEmployeeService } from '../../../employees/data-access/services/management-employee.service';
import { ManagementTicket, TicketPriority, TicketStatus } from '../../data-access/models/management-ticket.models';
import { ManagementTicketService } from '../../data-access/services/management-ticket.service';
import { ManagementTicketsStore } from '../../data-access/store/management-tickets.store';

interface TicketProfile {
  displayName: string;
  email: string;
  imageUrl: string | null;
}

enum TicketDateFilterOption {
  ALL = 'ALL',
  TODAY = 'TODAY',
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_30_DAYS = 'LAST_30_DAYS',
  CUSTOM = 'CUSTOM',
}

@Component({
  selector: 'app-management-tickets-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideSearch,
    LucideUser,
    LucideX,
    LucideChevronLeft,
    LucideChevronRight,
    LucideRotateCcw,
    LucideEye,
    SelectModule,
  ],
  providers: [ManagementTicketsStore],
  templateUrl: './management-tickets-page.component.html',
  styleUrl: './management-tickets-page.component.css',
})
export class ManagementTicketsPageComponent implements OnInit, OnDestroy {
  protected readonly store = inject(ManagementTicketsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);
  private readonly employeeService = inject(ManagementEmployeeService);
  private readonly ticketService = inject(ManagementTicketService);
  protected readonly TicketStatus = TicketStatus;
  protected readonly TicketPriority = TicketPriority;
  protected readonly TicketDateFilterOption = TicketDateFilterOption;

  protected search = '';
  protected customerEmail = '';
  protected status: TicketStatus | 'ALL' = 'ALL';
  protected priority: TicketPriority | 'ALL' = 'ALL';
  protected assigneeEmail = 'ALL';
  protected startDateVal = '';
  protected endDateVal = '';
  protected readonly dateFilterVal = signal<TicketDateFilterOption>(TicketDateFilterOption.ALL);
  protected readonly selectedLightboxImage = signal<string | null>(null);
  protected readonly ticketProfiles = signal<Record<string, TicketProfile>>({});
  private readonly loadingProfileEmails = new Set<string>();

  protected readonly datePresetOptions = [
    { label: 'Tất cả thời gian', value: TicketDateFilterOption.ALL },
    { label: 'Hôm nay', value: TicketDateFilterOption.TODAY },
    { label: '7 ngày qua', value: TicketDateFilterOption.LAST_7_DAYS },
    { label: '30 ngày qua', value: TicketDateFilterOption.LAST_30_DAYS },
    { label: 'Tùy chọn...', value: TicketDateFilterOption.CUSTOM },
  ];

  protected readonly assigneeFilterOptions = computed(() => {
    const options = new Map<string, TicketProfile>();

    for (const ticket of this.store.tickets()) {
      const email = this.normalizeEmail(ticket.assigneeEmail);
      if (email) {
        const profile = this.profileFor(email);
        options.set(email, {
          email,
          displayName: ticket.assigneeName?.trim() || profile?.displayName || email.split('@')[0],
          imageUrl: ticket.assigneeImageUrl?.trim() || profile?.imageUrl || null,
        });
      }
    }

    const assignees = Array.from(options.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
    return [
      { value: 'ALL', label: 'Tất cả người phụ trách', email: '', displayName: 'Tất cả người phụ trách', imageUrl: null },
      { value: 'UNASSIGNED', label: 'Chưa phân công', email: '', displayName: 'Chưa phân công', imageUrl: null },
      ...assignees.map(item => ({ value: item.email, label: item.displayName, ...item })),
    ];
  });

  constructor() {
    effect(() => {
      const tickets = this.store.tickets();
      const emails = new Set<string>();

      for (const ticket of tickets) {
        ticket.affectedUserEmails?.forEach(email => this.addEmail(emails, email));
        this.addEmail(emails, ticket.createdByEmail);
        this.addEmail(emails, ticket.assigneeEmail);
      }

      emails.forEach(email => this.ensureProfileLoaded(email));
    });
  }

  ngOnInit(): void {
    const initialCustomerEmail = this.route.snapshot.queryParamMap.get('customerEmail') || '';
    const initialTicketId = this.route.snapshot.queryParamMap.get('ticketId') || '';
    this.customerEmail = initialCustomerEmail;
    this.store.loadTickets({ customerEmail: initialCustomerEmail });
    if (initialTicketId) {
      this.openTicketFromQuery(initialTicketId);
    }
    this.store.connectRealtime();
  }

  ngOnDestroy(): void {
    this.store.disconnectRealtime();
  }

  protected applyFilters(): void {
    this.store.loadTickets({
      page: 0,
      search: this.search,
      customerEmail: this.customerEmail,
      status: this.status,
      priority: this.priority,
    });
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { customerEmail: this.customerEmail || null },
      queryParamsHandling: 'merge',
    });
  }

  protected refreshTickets(): void {
    this.store.loadTickets();
  }

  protected resetFilters(): void {
    this.search = '';
    this.customerEmail = '';
    this.status = 'ALL';
    this.priority = 'ALL';
    this.assigneeEmail = 'ALL';
    this.startDateVal = '';
    this.endDateVal = '';
    this.dateFilterVal.set(TicketDateFilterOption.ALL);
    this.store.selectTicket(null);
    this.store.resetFilters();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { customerEmail: null, ticketId: null },
      queryParamsHandling: 'merge',
    });
  }

  protected hasActiveFilters(): boolean {
    return !!this.search.trim()
      || !!this.customerEmail.trim()
      || this.status !== 'ALL'
      || this.priority !== 'ALL'
      || this.assigneeEmail !== 'ALL'
      || this.dateFilterVal() !== TicketDateFilterOption.ALL;
  }

  protected onSearchInput(event: Event): void {
    this.search = (event.target as HTMLInputElement).value;
    this.store.loadTickets({ page: 0, search: this.search, customerEmail: this.customerEmail });
  }

  protected onStatusFilterChange(value: TicketStatus | 'ALL'): void {
    this.status = value;
    this.store.loadTickets({ page: 0, status: value, customerEmail: this.customerEmail });
  }

  protected onPriorityFilterChange(event: Event): void {
    this.priority = (event.target as HTMLSelectElement).value as TicketPriority | 'ALL';
    this.store.loadTickets({ page: 0, priority: this.priority, customerEmail: this.customerEmail });
  }

  protected onAssigneeFilterChange(value: string): void {
    this.assigneeEmail = value;
    this.store.setAssigneeEmail(value);
  }

  protected onDateRangeChange(): void {
    const start = this.startDateVal || null;
    const end = this.endDateVal || null;
    this.store.setDateRange(start, end);
  }

  protected onDatePresetChange(preset: TicketDateFilterOption): void {
    this.dateFilterVal.set(preset);

    if (preset === TicketDateFilterOption.CUSTOM) {
      this.onDateRangeChange();
      return;
    }

    let start: string | null = null;
    let end: string | null = null;
    const now = new Date();
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return year + '-' + month + '-' + day;
    };

    if (preset === TicketDateFilterOption.TODAY) {
      start = formatDate(now);
      end = formatDate(now);
    } else if (preset === TicketDateFilterOption.LAST_7_DAYS) {
      start = formatDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
      end = formatDate(now);
    } else if (preset === TicketDateFilterOption.LAST_30_DAYS) {
      start = formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      end = formatDate(now);
    }

    this.startDateVal = start || '';
    this.endDateVal = end || '';
    this.store.setDateRange(start, end);
  }

  protected selectTicket(ticket: ManagementTicket): void {
    this.store.selectTicket(ticket);
  }

  protected closeDetails(): void {
    this.store.selectTicket(null);
    if (this.route.snapshot.queryParamMap.has('ticketId')) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { ticketId: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  protected changePage(page: number): void {
    this.store.setPage(page);
  }

  protected changeSize(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value) || 10;
    this.store.setSize(size);
  }

  protected splitImages(images?: string | null): string[] {
    return (images || '').split(',').map(item => item.trim()).filter(Boolean);
  }

  protected openLightbox(url: string): void {
    this.selectedLightboxImage.set(url);
  }

  protected closeLightbox(): void {
    this.selectedLightboxImage.set(null);
  }

  protected statusLabel(status: TicketStatus): string {
    switch (status) {
      case TicketStatus.OPEN: return 'Đang mở';
      case TicketStatus.IN_PROGRESS: return 'Đang xử lý';
      case TicketStatus.RESOLVED: return 'Đã xử lý';
      case TicketStatus.CLOSED: return 'Đã đóng';
      default: return status;
    }
  }

  protected primaryCustomerEmail(ticket: ManagementTicket): string {
    return ticket.affectedUserEmails?.[0] || ticket.createdByEmail || '';
  }

  protected displayCustomerName(ticket: ManagementTicket, email?: string): string {
    const source = email || ticket.createdByEmail || ticket.affectedUserEmails?.[0] || '';
    const profile = this.profileFor(source);

    if (profile?.displayName) return profile.displayName;
    if (!email && ticket.createdByName) return ticket.createdByName;

    return source ? source.split('@')[0] : 'Khách hàng';
  }

  protected getAssigneeName(ticket: ManagementTicket): string {
    const profile = this.profileFor(ticket.assigneeEmail);
    return ticket.assigneeName || profile?.displayName || ticket.assigneeEmail?.split('@')[0] || 'Chưa phân công';
  }

  protected profileFor(email?: string | null): TicketProfile | null {
    const normalized = this.normalizeEmail(email);
    return normalized ? this.ticketProfiles()[normalized] ?? null : null;
  }

  protected displayNameForEmail(email?: string | null): string {
    const normalized = this.normalizeEmail(email);
    const profile = this.profileFor(normalized);
    return profile?.displayName || normalized?.split('@')[0] || 'ZT';
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
      'linear-gradient(135deg, #2f7d20 0%, #65a30d 100%)',
      'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
      'linear-gradient(135deg, #e11d48 0%, #f97316 100%)',
      'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
      'linear-gradient(135deg, #0f766e 0%, #22c55e 100%)',
      'linear-gradient(135deg, #334155 0%, #64748b 100%)',
    ];
    return gradients[Math.abs(hash) % gradients.length];
  }

  private openTicketFromQuery(ticketId: string): void {
    this.ticketService.getTicketById(ticketId).subscribe({
      next: ticket => this.store.selectTicket(ticket),
      error: () => undefined,
    });
  }

  private addEmail(emails: Set<string>, email?: string | null): void {
    const normalized = this.normalizeEmail(email);
    if (normalized) {
      emails.add(normalized);
    }
  }

  private normalizeEmail(email?: string | null): string {
    return (email || '').trim().toLowerCase();
  }

  private ensureProfileLoaded(email: string): void {
    if (this.ticketProfiles()[email] || this.loadingProfileEmails.has(email)) {
      return;
    }

    this.loadingProfileEmails.add(email);

    forkJoin({
      customers: this.customerService.getCustomers({
        page: 0,
        size: 5,
        sort: 'registeredAt,desc',
        keyword: email,
        activeFilter: 'all',
      }).pipe(catchError(() => of(null))),
      employees: this.employeeService.getEmployees({
        page: 0,
        size: 5,
        sort: 'createdAt,desc',
        keyword: email,
        active: null,
        role: null,
      }).pipe(catchError(() => of(null))),
    }).subscribe(({ customers, employees }) => {
      const customer = customers?.content.find(item => this.normalizeEmail(item.email) === email);
      const employee = employees?.employees.find(item => this.normalizeEmail(item.email) === email);
      const profileSource = customer || employee;

      if (profileSource) {
        this.ticketProfiles.update(current => ({
          ...current,
          [email]: {
            displayName: profileSource.fullName?.trim() || email.split('@')[0],
            email,
            imageUrl: profileSource.imageUrl?.trim() || null,
          },
        }));
      }

      this.loadingProfileEmails.delete(email);
    });
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
}
