import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideArrowLeft,
  LucideActivity,
  LucideCpu,
  LucideFileText,
  LucideAlertCircle,
  LucidePlusCircle,
  LucideUser
} from '@lucide/angular';
import { AdminStore } from '../../../data-access/store/admin.store';
import { AdminIncidentsService } from '../../data-access/services/admin-incidents.service';
import { AdminLogsService } from '../../../data-access/services/admin-logs.service';
import { AccountService } from '../../../accounts/data-access/services/account.service';
import { AccountSortField, SortDirection, AccountSummary, AdminAccountRole } from '../../../accounts/data-access/models/account.model';
import {
  IncidentStatus,
  IncidentSeverity,
  TicketStatus,
  TicketPriority,
  SystemIncident,
  ActivityLog,
  AiAnalysis
} from '../../../data-access/models/admin.models';

@Component({
  selector: 'app-admin-incident-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    LucideArrowLeft,
    LucideActivity,
    LucideCpu,
    LucideFileText,
    LucideAlertCircle,
    LucidePlusCircle,
    LucideUser
  ],
  templateUrl: './incident-detail.component.html',
  styleUrl: './incident-detail.component.css'
})
export class IncidentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminIncidentsService = inject(AdminIncidentsService);
  private readonly adminLogsService = inject(AdminLogsService);
  private readonly accountService = inject(AccountService);
  
  protected readonly store = inject(AdminStore);
  protected readonly IncidentStatus = IncidentStatus;
  protected readonly IncidentSeverity = IncidentSeverity;
  protected readonly TicketStatus = TicketStatus;
  protected readonly TicketPriority = TicketPriority;

  protected readonly incident = signal<any | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly userActivityLogs = signal<ActivityLog[]>([]);
  protected readonly isLoadingActivity = signal(false);

  // Profiles & Staff list
  protected readonly assigneeProfile = signal<any | null>(null);
  protected readonly affectedUserProfile = signal<any | null>(null);
  protected readonly staffAccounts = signal<AccountSummary[]>([]);
  protected readonly isAssigneeDropdownOpen = signal(false);

  // AI Analysis local states
  protected readonly isAnalyzing = signal(false);

  // Create ticket form states
  protected readonly showTicketForm = signal(false);
  protected ticketTitle = '';
  protected ticketDesc = '';
  protected ticketPriority = TicketPriority.MEDIUM;

  ngOnInit(): void {
    this.loadIncidentDetails();
    this.loadStaffAccounts();
  }

  private loadIncidentDetails(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/admin/incidents']);
      return;
    }

    this.isLoading.set(true);
    this.adminIncidentsService.getIncidentById(id).subscribe({
      next: (res) => {
        const inc = res.data;
        // Map to displayable dates
        const mappedInc = {
          ...inc,
          occurredAt: inc.occurredAt ? new Date(inc.occurredAt) : undefined,
          createdAt: inc.createdAt ? new Date(inc.createdAt) : undefined,
          resolvedAt: inc.resolvedAt ? new Date(inc.resolvedAt) : undefined
        };
        this.incident.set(mappedInc);
        this.isLoading.set(false);

        // 1. Tải logs liên quan từ Loki bằng traceId
        if (mappedInc.traceId) {
          this.store.loadLogs({ level: 'ALL', search: '', traceId: mappedInc.traceId });
        }

        // 2. Tải activity logs của user liên quan
        if (mappedInc.userEmail) {
          this.loadUserActivities(mappedInc.userEmail);
          this.loadProfile(mappedInc.userEmail, false);
        }

        // 3. Tải profile của assignee
        if (mappedInc.assignee) {
          this.loadProfile(mappedInc.assignee, true);
        } else {
          this.assigneeProfile.set(null);
        }
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
        this.router.navigate(['/admin/incidents']);
      }
    });
  }

  private loadUserActivities(email: string): void {
    this.isLoadingActivity.set(true);
    this.adminLogsService.getActivityLogs(0, 15, email).subscribe({
      next: (res) => {
        const mappedLogs = res.data.content.map(logItem => ({
          ...logItem,
          timestamp: new Date(logItem.timestamp)
        }));
        this.userActivityLogs.set(mappedLogs);
        this.isLoadingActivity.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoadingActivity.set(false);
      }
    });
  }

  private loadProfile(keyword: string, isAssignee: boolean): void {
    this.accountService.getAccounts({
      page: 0,
      size: 1,
      sortField: AccountSortField.CreatedAt,
      sortDirection: SortDirection.Desc,
      keyword: keyword,
      role: null,
      active: null
    }).subscribe({
      next: (res) => {
        if (res.data && res.data.content && res.data.content.length > 0) {
          const account = res.data.content[0];
          const profile = {
            displayName: account.displayName || account.email,
            email: account.email,
            imageUrl: account.imageUrl || null
          };
          if (isAssignee) {
            this.assigneeProfile.set(profile);
          } else {
            this.affectedUserProfile.set(profile);
          }
        } else {
          // Fallback if not found
          const fallbackProfile = {
            displayName: keyword.includes('@') ? keyword.split('@')[0] : keyword,
            email: keyword.includes('@') ? keyword : '',
            imageUrl: null
          };
          if (isAssignee) {
            this.assigneeProfile.set(fallbackProfile);
          } else {
            this.affectedUserProfile.set(fallbackProfile);
          }
        }
      },
      error: () => {
        const fallbackProfile = {
          displayName: keyword.includes('@') ? keyword.split('@')[0] : keyword,
          email: keyword.includes('@') ? keyword : '',
          imageUrl: null
        };
        if (isAssignee) {
          this.assigneeProfile.set(fallbackProfile);
        } else {
          this.affectedUserProfile.set(fallbackProfile);
        }
      }
    });
  }

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

  protected handleStatusChange(event: Event): void {
    const inc = this.incident();
    if (!inc) return;

    const select = event.target as HTMLSelectElement;
    const newStatus = select.value as IncidentStatus;

    this.adminIncidentsService.updateIncidentStatus(inc.id, { status: newStatus }).subscribe({
      next: (res) => {
        this.incident.set({
          ...inc,
          status: res.data.status,
          resolvedAt: res.data.resolvedAt ? new Date(res.data.resolvedAt) : undefined
        });
        this.store.loadIncidents({});
      }
    });
  }

  protected handleSeverityChange(event: Event): void {
    const inc = this.incident();
    if (!inc) return;

    const select = event.target as HTMLSelectElement;
    const newSeverity = select.value as IncidentSeverity;

    this.adminIncidentsService.updateIncidentStatus(inc.id, { severity: newSeverity }).subscribe({
      next: (res) => {
        this.incident.set({
          ...inc,
          severity: res.data.severity
        });
        this.store.loadIncidents({});
      }
    });
  }

  private loadStaffAccounts(): void {
    this.accountService.getAccounts({
      page: 0,
      size: 100,
      sortField: AccountSortField.Email,
      sortDirection: SortDirection.Asc,
      keyword: '',
      role: null,
      active: true
    }).subscribe({
      next: (res) => {
        if (res.data && res.data.content) {
          // Chỉ lấy các tài khoản có vai trò ADMIN
          const staffs = res.data.content.filter(acc => acc.role === AdminAccountRole.ADMIN);
          this.staffAccounts.set(staffs);
        }
      },
      error: (err) => console.error('Failed to load staff accounts', err)
    });
  }

  protected selectAssignee(email: string | null): void {
    const inc = this.incident();
    if (!inc) return;

    const newAssignee = email || null;

    this.adminIncidentsService.updateIncidentStatus(inc.id, { assignee: newAssignee || '' }).subscribe({
      next: () => {
        this.incident.set({
          ...inc,
          assignee: newAssignee
        });
        if (newAssignee) {
          this.loadProfile(newAssignee, true);
        } else {
          this.assigneeProfile.set(null);
        }
        this.store.loadIncidents({});
        this.isAssigneeDropdownOpen.set(false);
      }
    });
  }

  protected handleRunAiAnalysis(): void {
    const inc = this.incident();
    if (!inc) return;

    this.isAnalyzing.set(true);
    this.store.analyzeIncident(
      inc.id,
      (analysis: AiAnalysis) => {
        this.isAnalyzing.set(false);
        this.incident.set({
          ...this.incident(),
          aiAnalysis: {
            ...analysis,
            createdAt: new Date(analysis.createdAt)
          }
        });
      },
      () => {
        this.isAnalyzing.set(false);
      }
    );
  }

  protected handleCreateTicket(): void {
    const inc = this.incident();
    if (!inc) return;

    if (!this.ticketTitle.trim()) return;

    const payload = {
      title: this.ticketTitle,
      description: this.ticketDesc,
      priority: this.ticketPriority,
      status: TicketStatus.OPEN,
      incidentId: inc.id
    };

    this.store.createTicketFromIncident(payload, () => {
      this.showTicketForm.set(false);
      // Reload để cập nhật mã ticket liên kết
      this.loadIncidentDetails();
    });
  }

  protected toggleTicketForm(): void {
    const inc = this.incident();
    if (!inc) return;

    this.ticketTitle = `Sửa lỗi sự cố ${inc.code}: ${inc.errorMessage || 'Lỗi hệ thống'}`;
    this.ticketDesc = `Sự cố phát sinh tại API: ${inc.httpMethod} ${inc.apiPath}\nTrạng thái lỗi: ${inc.statusCode}\nThông điệp: ${inc.errorMessage}\n\nVui lòng kiểm tra nguyên nhân gốc và khắc phục.`;
    this.showTicketForm.set(!this.showTicketForm());
  }
}
