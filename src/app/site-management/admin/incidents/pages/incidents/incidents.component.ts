import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideEye, LucideRotateCcw, LucideSearch, LucideUser, LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { SelectModule } from 'primeng/select';
import { AdminStore } from '../../../data-access/store/admin.store';
import { IncidentStatus, IncidentSeverity, SystemIncident } from '../../../data-access/models/admin.models';
import { AccountService } from '../../../accounts/data-access/services/account.service';
import { AccountSortField, SortDirection, AccountSummary, AdminAccountRole } from '../../../accounts/data-access/models/account.model';

interface AssigneeProfile {
  email: string;
  displayName: string;
  imageUrl: string | null;
}

export enum IncidentDateFilterOption {
  ALL = 'ALL',
  TODAY = 'TODAY',
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_30_DAYS = 'LAST_30_DAYS',
  CUSTOM = 'CUSTOM'
}

@Component({
  selector: 'app-admin-incidents',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideEye,
    LucideRotateCcw,
    LucideSearch,
    LucideUser,
    LucideChevronLeft,
    LucideChevronRight,
    SelectModule
  ],
  templateUrl: './incidents.component.html',
  styleUrl: './incidents.component.css'
})
export class IncidentsComponent implements OnInit {
  protected readonly store = inject(AdminStore);
  private readonly router = inject(Router);
  private readonly accountService = inject(AccountService);

  protected readonly IncidentStatus = IncidentStatus;
  protected readonly IncidentSeverity = IncidentSeverity;
  protected readonly IncidentDateFilterOption = IncidentDateFilterOption;
  protected readonly activeFilter = signal<IncidentStatus | 'ALL'>('ALL');

  protected searchVal = '';
  protected severityVal: IncidentSeverity | 'ALL' = 'ALL';
  protected assigneeVal = 'ALL';
  protected startDateVal = '';
  protected endDateVal = '';
  protected readonly staffAccounts = signal<AccountSummary[]>([]);
  protected dateFilterVal = signal<IncidentDateFilterOption>(IncidentDateFilterOption.TODAY);


  protected readonly datePresetOptions = [
    { label: 'Tất cả thời gian', value: IncidentDateFilterOption.ALL },
    { label: 'Hôm nay', value: IncidentDateFilterOption.TODAY },
    { label: '7 ngày qua', value: IncidentDateFilterOption.LAST_7_DAYS },
    { label: '30 ngày qua', value: IncidentDateFilterOption.LAST_30_DAYS },
    { label: 'Tùy chọn...', value: IncidentDateFilterOption.CUSTOM }
  ];

  protected readonly totalPages = computed(() => {
    const total = this.store.totalIncidents();
    const size = this.store.incidentSize();
    return Math.ceil(total / size) || 1;
  });

  protected readonly startRecordIndex = computed(() => {
    const total = this.store.totalIncidents();
    if (total === 0) return 0;
    return this.store.incidentPage() * this.store.incidentSize() + 1;
  });

  protected readonly endRecordIndex = computed(() => {
    const total = this.store.totalIncidents();
    const size = this.store.incidentSize();
    const page = this.store.incidentPage();
    return Math.min(total, (page + 1) * size);
  });

  protected changePage(page: number): void {
    this.store.setIncidentPage(page);
  }

  protected changeSize(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.store.setIncidentSize(parseInt(select.value, 10));
  }

  ngOnInit(): void {
    this.onDatePresetChange(IncidentDateFilterOption.TODAY);
    this.loadStaffAccounts();
  }

  protected handleFilterChange(filter: IncidentStatus | 'ALL'): void {
    this.activeFilter.set(filter);
    this.store.setIncidentFilter(filter);
  }

  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchVal = input.value;
    this.store.setIncidentSearch(this.searchVal);
  }

  protected onSeverityFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.severityVal = select.value as IncidentSeverity | 'ALL';
    this.store.setIncidentSeverityFilter(this.severityVal);
  }

  protected onAssigneeFilterChange(value: string): void {
    this.assigneeVal = value;
    this.store.setIncidentAssigneeFilter(this.assigneeVal);
  }

  protected onDateRangeChange(): void {
    const start = this.startDateVal ? this.startDateVal : null;
    const end = this.endDateVal ? this.endDateVal : null;
    this.startDateVal = start ?? '';
    this.endDateVal = end ?? '';
    this.store.setIncidentDateRange(start, end);
  }

  protected onDatePresetChange(preset: IncidentDateFilterOption): void {
    this.dateFilterVal.set(preset);

    if (preset === IncidentDateFilterOption.CUSTOM) {
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

    if (preset === IncidentDateFilterOption.TODAY) {
      start = formatDate(now);
      end = formatDate(now);
    } else if (preset === IncidentDateFilterOption.LAST_7_DAYS) {
      const startD = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start = formatDate(startD);
      end = formatDate(now);
    } else if (preset === IncidentDateFilterOption.LAST_30_DAYS) {
      const startD = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      start = formatDate(startD);
      end = formatDate(now);
    }

    this.startDateVal = start ?? '';
    this.endDateVal = end ?? '';
    this.store.setIncidentDateRange(start, end);
  }

  protected handleResetFilters(): void {
    this.searchVal = '';
    this.severityVal = 'ALL';
    this.assigneeVal = 'ALL';
    this.dateFilterVal.set(IncidentDateFilterOption.TODAY);
    this.activeFilter.set('ALL');
    this.store.resetIncidentFilters();
    this.onDatePresetChange(IncidentDateFilterOption.TODAY);
  }

  protected viewIncidentDetails(incident: SystemIncident): void {
    this.router.navigate(['/admin/incidents', incident.id]);
  }

  protected getAssigneeProfile(incident: SystemIncident): AssigneeProfile | null {
    const assigneeEmail = incident.assigneeEmail || incident.assignee;
    if (!assigneeEmail) {
      return null;
    }

    const account = this.staffAccounts().find(staff => staff.email === assigneeEmail);
    if (account) {
      return {
        email: account.email,
        displayName: account.displayName || account.email,
        imageUrl: account.imageUrl
      };
    }

    return {
      email: assigneeEmail,
      displayName: incident.assigneeName || this.formatEmailName(assigneeEmail),
      imageUrl: incident.assigneeImageUrl || null
    };
  }

  protected readonly assigneeFilterOptions = computed(() => {
    const options = new Map<string, AssigneeProfile>();

    for (const staff of this.staffAccounts()) {
      options.set(staff.email, {
        email: staff.email,
        displayName: staff.displayName || staff.email,
        imageUrl: staff.imageUrl
      });
    }

    for (const incident of this.store.incidents()) {
      const profile = this.getAssigneeProfile(incident);
      if (profile && !options.has(profile.email)) {
        options.set(profile.email, profile);
      }
    }

    const profiles = Array.from(options.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
    return [
      { value: 'ALL', label: 'Tất cả người phụ trách', email: '', displayName: 'Tất cả người phụ trách', imageUrl: null },
      { value: 'UNASSIGNED', label: 'Chưa phân công', email: '', displayName: 'Chưa phân công', imageUrl: null },
      ...profiles.map(p => ({
        value: p.email,
        label: p.displayName,
        email: p.email,
        displayName: p.displayName,
        imageUrl: p.imageUrl
      }))
    ];
  });

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
      'linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)'
    ];

    return gradients[Math.abs(hash) % gradients.length];
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
      error: (err) => console.error('Failed to load incident assignees', err)
    });
  }

  private formatEmailName(email: string): string {
    return email.includes('@') ? email.split('@')[0] : email;
  }
}
