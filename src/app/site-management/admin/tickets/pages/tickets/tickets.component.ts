import { Component, OnInit, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideSearch,
  LucideRotateCcw,
  LucideUser,
  LucideChevronLeft,
  LucideChevronRight,
  LucideX
} from '@lucide/angular';
import { SelectModule } from 'primeng/select';
import { AdminStore } from '../../../data-access/store/admin.store';
import { TicketStatus, SupportTicket, TicketPriority, AdminAccountRole } from '../../../data-access/models/admin.models';
import { AccountService } from '../../../accounts/data-access/services/account.service';
import { AccountSortField, SortDirection } from '../../../accounts/data-access/models/account.model';
import { AuthStorageService } from '../../../../../core/services/auth-storage.service';

export enum TicketDateFilterOption {
  ALL = 'ALL',
  TODAY = 'TODAY',
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_30_DAYS = 'LAST_30_DAYS',
  CUSTOM = 'CUSTOM'
}

@Component({
  selector: 'app-admin-tickets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideSearch,
    LucideRotateCcw,
    LucideUser,
    LucideChevronLeft,
    LucideChevronRight,
    LucideX,
    SelectModule
  ],
  templateUrl: './tickets.component.html',
  styleUrl: './tickets.component.css'
})
export class TicketsComponent implements OnInit {
  protected readonly store = inject(AdminStore);
  private readonly accountService = inject(AccountService);
  private readonly authStorageService = inject(AuthStorageService);

  protected readonly TicketStatus = TicketStatus;
  protected readonly TicketPriority = TicketPriority;
  protected readonly TicketDateFilterOption = TicketDateFilterOption;

  protected readonly activeFilter = signal<TicketStatus | 'ALL'>('ALL');
  protected readonly selectedTicketId = signal<string | null>(null);

  // Advanced Filter values
  protected searchVal = '';
  protected priorityVal: TicketPriority | 'ALL' = 'ALL';
  protected assigneeVal = 'ALL';
  protected startDateVal = '';
  protected endDateVal = '';
  protected readonly staffAccounts = signal<any[]>([]);
  protected readonly dateFilterVal = signal<TicketDateFilterOption>(TicketDateFilterOption.ALL);


  protected readonly datePresetOptions = [
    { label: 'Tất cả thời gian', value: TicketDateFilterOption.ALL },
    { label: 'Hôm nay', value: TicketDateFilterOption.TODAY },
    { label: '7 ngày qua', value: TicketDateFilterOption.LAST_7_DAYS },
    { label: '30 ngày qua', value: TicketDateFilterOption.LAST_30_DAYS },
    { label: 'Tùy chọn...', value: TicketDateFilterOption.CUSTOM }
  ];

  protected readonly userProfiles = signal<Record<string, { displayName: string; email: string; imageUrl: string | null }>>({});
  private readonly loadedEmails = new Set<string>();

  protected readonly assigneeFilterOptions = computed(() => {
    const options = new Map<string, { email: string; displayName: string; imageUrl: string | null }>();

    for (const staff of this.staffAccounts()) {
      options.set(staff.email, {
        email: staff.email,
        displayName: staff.displayName || staff.email,
        imageUrl: staff.imageUrl
      });
    }

    for (const tck of this.store.tickets()) {
      if (tck.assigneeEmail && !options.has(tck.assigneeEmail)) {
        options.set(tck.assigneeEmail, {
          email: tck.assigneeEmail,
          displayName: tck.assigneeName || tck.assigneeEmail.split('@')[0],
          imageUrl: null
        });
      }
    }

    const profiles = Array.from(options.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
    const result: Array<{ value: string; label: string; email: string; displayName: string; imageUrl: string | null }> = [
      { value: 'ALL', label: 'Tất cả người phụ trách', email: '', displayName: 'Tất cả người phụ trách', imageUrl: null },
      { value: 'UNASSIGNED', label: 'Chưa phân công', email: '', displayName: 'Chưa phân công', imageUrl: null }
    ];

    const currentSession = this.authStorageService.getSession();
    const currentEmail = currentSession?.email;
    if (currentEmail) {
      result.push({
        value: currentEmail,
        label: 'Chỉ tôi (Tôi)',
        email: currentEmail,
        displayName: currentSession.fullName || currentEmail.split('@')[0],
        imageUrl: currentSession.avatarUrl || null
      });
    }

    return [
      ...result,
      ...profiles.filter(p => p.email !== currentEmail).map(p => ({
        value: p.email,
        label: p.displayName,
        email: p.email,
        displayName: p.displayName,
        imageUrl: p.imageUrl
      }))
    ];
  });

  protected readonly ticketAssigneeOptions = computed(() => {
    const options = new Map<string, { email: string; displayName: string; imageUrl: string | null }>();

    for (const staff of this.staffAccounts()) {
      options.set(staff.email, {
        email: staff.email,
        displayName: staff.displayName || staff.email,
        imageUrl: staff.imageUrl
      });
    }

    const profiles = Array.from(options.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
    return [
      { value: 'UNASSIGNED', label: 'Chưa phân công', email: '', displayName: 'Chưa phân công', imageUrl: null, id: null },
      ...profiles.map(p => {
        const staff = this.staffAccounts().find((s: any) => s.email === p.email);
        return {
          value: p.email,
          label: p.displayName,
          email: p.email,
          displayName: p.displayName,
          imageUrl: p.imageUrl,
          id: staff ? staff.id : null
        };
      })
    ];
  });

  protected readonly totalPages = computed(() => {
    const total = this.store.totalTickets();
    const size = this.store.ticketSize();
    return Math.ceil(total / size) || 1;
  });

  protected readonly startRecordIndex = computed(() => {
    const total = this.store.totalTickets();
    if (total === 0) return 0;
    return this.store.ticketPage() * this.store.ticketSize() + 1;
  });

  protected readonly endRecordIndex = computed(() => {
    const total = this.store.totalTickets();
    const size = this.store.ticketSize();
    const page = this.store.ticketPage();
    return Math.min(total, (page + 1) * size);
  });

  protected changePage(page: number): void {
    this.store.setTicketPage(page);
  }

  protected changeSize(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.store.setTicketSize(parseInt(select.value, 10));
  }

  constructor() {
    effect(() => {
      const tickets = this.store.tickets();
      if (tickets && tickets.length > 0) {
        for (const tck of tickets) {
          const emails = new Set<string>();
          if (tck.createdByEmail) {
            emails.add(tck.createdByEmail);
          }
          if (tck.affectedUserEmails && tck.affectedUserEmails.length > 0) {
            tck.affectedUserEmails.forEach(e => emails.add(e));
          }

          for (const email of emails) {
            if (email && !this.loadedEmails.has(email)) {
              this.loadedEmails.add(email);
              this.accountService.getAccounts({
                page: 0,
                size: 1,
                sortField: AccountSortField.CreatedAt,
                sortDirection: SortDirection.Desc,
                keyword: email,
                role: null,
                active: null
              }).subscribe({
                next: (res) => {
                  if (res.data && res.data.content && res.data.content.length > 0) {
                    const account = res.data.content[0];
                    this.userProfiles.update(map => ({
                      ...map,
                      [email]: {
                        displayName: account.displayName || email.split('@')[0],
                        email: account.email,
                        imageUrl: account.imageUrl || null
                      }
                    }));
                  }
                }
              });
            }
          }
        }
      }
    });
  }

  ngOnInit(): void {
    this.store.loadTickets({});
    this.loadStaffAccounts();
  }

  protected handleFilterChange(filter: TicketStatus | 'ALL'): void {
    this.activeFilter.set(filter);
    this.store.setTicketFilter(filter);
    
    // Clear selection if filtered out
    const activeTicket = this.getSelectedTicket();
    if (activeTicket && filter !== 'ALL' && activeTicket.status !== filter) {
      this.selectedTicketId.set(null);
    }
  }

  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchVal = input.value;
    this.store.setTicketSearch(this.searchVal);
  }

  protected onPriorityFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.priorityVal = select.value as TicketPriority | 'ALL';
    this.store.setTicketPriorityFilter(this.priorityVal);
  }

  protected onDateRangeChange(): void {
    const start = this.startDateVal ? this.startDateVal : null;
    const end = this.endDateVal ? this.endDateVal : null;
    this.store.setTicketDateRange(start, end);
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

    const formatDate = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === TicketDateFilterOption.TODAY) {
      start = formatDate(now);
      end = formatDate(now);
    } else if (preset === TicketDateFilterOption.LAST_7_DAYS) {
      const startD = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start = formatDate(startD);
      end = formatDate(now);
    } else if (preset === TicketDateFilterOption.LAST_30_DAYS) {
      const startD = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      start = formatDate(startD);
      end = formatDate(now);
    }

    this.store.setTicketDateRange(start, end);
  }

  protected hasActiveFilters(): boolean {
    return this.searchVal.trim() !== '' ||
           this.priorityVal !== 'ALL' ||
           this.assigneeVal !== 'ALL' ||
           this.dateFilterVal() !== TicketDateFilterOption.ALL ||
           this.activeFilter() !== 'ALL';
  }

  protected handleResetFilters(): void {
    this.searchVal = '';
    this.priorityVal = 'ALL';
    this.assigneeVal = 'ALL';
    this.startDateVal = '';
    this.endDateVal = '';
    this.dateFilterVal.set(TicketDateFilterOption.ALL);
    this.activeFilter.set('ALL');
    this.store.resetTicketFilters();
  }

  protected onAssigneeFilterChange(value: string): void {
    this.assigneeVal = value;
    this.store.setTicketAssigneeFilter(this.assigneeVal);
  }

  protected selectTicket(id: string): void {
    this.selectedTicketId.set(id);
  }

  protected closeDetails(): void {
    this.selectedTicketId.set(null);
  }

  protected getSelectedTicket(): SupportTicket | null {
    const id = this.selectedTicketId();
    if (!id) return null;
    return this.store.tickets().find(t => t.id === id) || null;
  }

  protected handleStatusChange(event: Event): void {
    const ticketId = this.selectedTicketId();
    if (!ticketId) return;

    const select = event.target as HTMLSelectElement;
    this.store.updateTicketStatus(ticketId, select.value as TicketStatus);
  }

  protected handleAssigneeChange(email: string | null): void {
    const ticketId = this.selectedTicketId();
    if (!ticketId) return;

    const selectedOption = this.ticketAssigneeOptions().find(opt => opt.value === (email || 'UNASSIGNED'));
    const assigneeId = selectedOption ? selectedOption.id : null;

    this.store.updateTicketAssignee(ticketId, assigneeId);
  }

  protected getAssigneeProfile(email: string | undefined): { displayName: string; email: string; imageUrl: string | null } | null {
    if (!email) return null;
    const staff = this.staffAccounts().find((s: any) => s.email === email);
    if (staff) {
      return {
        displayName: staff.displayName || staff.fullName || email.split('@')[0],
        email: staff.email,
        imageUrl: staff.imageUrl || null
      };
    }
    return {
      displayName: email.split('@')[0],
      email: email,
      imageUrl: null
    };
  }

  // Avatar generation helpers
  protected getInitials(name: string): string {
    const initials = (name || 'ZT')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
    return initials || 'ZT';
  }

  protected getAvatarGradient(email: string): string {
    if (!email) {
      return 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)';
    }
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
      'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
      'linear-gradient(135deg, #4E65FF 0%, #92EFFD 100%)',
      'linear-gradient(135deg, #76B852 0%, #8DC26F 100%)',
      'linear-gradient(135deg, #F2709C 0%, #FF9472 100%)',
      'linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%)',
      'linear-gradient(135deg, #11998E 0%, #38EF7D 100%)',
      'linear-gradient(135deg, #8A2387 0%, #E94057 100%)',
      'linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    ];
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  }

  private loadStaffAccounts(): void {
    this.accountService.getAccounts({
      page: 0,
      size: 100,
      sortField: AccountSortField.Email,
      sortDirection: SortDirection.Asc,
      keyword: '',
      role: AdminAccountRole.ADMIN,
      active: true
    }).subscribe({
      next: (res) => this.staffAccounts.set(res.data?.content || []),
      error: (err) => console.error('Failed to load ticket assignees', err)
    });
  }
}
