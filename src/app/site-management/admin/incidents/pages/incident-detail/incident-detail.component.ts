import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed } from '@angular/core';
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
  LucideX,
  LucideGlobe,
  LucideTerminal,
  LucideBot,
  LucideCopy,
  LucideSparkles,
  LucideUpload,
  LucideUser,
  LucideEye
} from '@lucide/angular';
import { SelectModule } from 'primeng/select';
import { EditorModule } from 'primeng/editor';
import { AdminStore } from '../../../data-access/store/admin.store';
import { AdminIncidentsService } from '../../data-access/services/admin-incidents.service';
import { AdminLogsService } from '../../../data-access/services/admin-logs.service';
import { AccountService } from '../../../accounts/data-access/services/account.service';
import { AccountSortField, SortDirection, AccountSummary, AdminAccountRole } from '../../../accounts/data-access/models/account.model';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { AdminProfileService } from '../../../data-access/services/admin-profile.service';
import { AdminUploadPresignResponseDto } from '../../../data-access/models/admin-profile.model';
import {
  IncidentStatus,
  IncidentSeverity,
  TicketStatus,
  TicketPriority,
  SystemIncident,
  ActivityLog,
  AiAnalysis,
  LogLevel,
  LogServiceCategory,
  SystemLog,
  ActivityArea,
  ActivitySeverity
} from '../../../data-access/models/admin.models';

interface LogMetadataItem {
  label: string;
  value: string;
}

interface LogJourneyItem {
  id: string;
  time: Date;
  title: string;
  description: string;
  level: LogLevel;
  category: string;
  isCurrent: boolean;
}

interface ClientLogStackContext {
  eventType?: string;
  routeUrl?: string;
  traceId?: string;
  method?: string;
  apiPath?: string;
  statusCode?: number;
  durationMs?: number | null;
  userEmail?: string | null;
  userRole?: string | null;
  productId?: string | null;
  orderId?: string | null;
  quantity?: number | null;
  result?: string | null;
  reason?: string | null;
}

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
  selector: 'app-admin-incident-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    LucideX,
    LucideGlobe,
    LucideTerminal,
    LucideBot,
    LucideCopy,
    LucideSparkles,
    LucideUpload,
    LucideUser,
    LucideEye,
    SelectModule,
    EditorModule
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
  private readonly toastService = inject(ToastService);
  private readonly adminProfileService = inject(AdminProfileService);
  
  protected readonly store = inject(AdminStore);
  protected readonly IncidentStatus = IncidentStatus;
  protected readonly IncidentSeverity = IncidentSeverity;
  protected readonly TicketStatus = TicketStatus;
  protected readonly TicketPriority = TicketPriority;
  protected readonly LogLevel = LogLevel;
  protected readonly LogServiceCategory = LogServiceCategory;

  protected readonly incident = signal<any | null>(null);
  protected readonly selectedSystemLog = signal<SystemLog | null>(null);
  protected readonly selectedActivityLog = signal<ActivityLog | null>(null);
  protected readonly systemLogViewModeMap = signal<Record<string, 'structured' | 'raw'>>({});
  protected readonly explanations = signal<Record<string, string>>({});
  protected readonly explainingIds = signal<Record<string, boolean>>({});
  protected readonly isLoading = signal(false);
  protected readonly userActivityLogs = signal<ActivityLog[]>([]);
  protected readonly isLoadingActivity = signal(false);

  // Profiles & Staff list
  protected readonly assigneeProfile = signal<any | null>(null);
  protected readonly affectedUserProfile = signal<any | null>(null);
  protected readonly affectedUserProfiles = signal<any[]>([]);
  protected readonly staffAccounts = signal<AccountSummary[]>([]);
  protected readonly selectedTraceId = signal<string | null>(null);
  protected readonly selectedTimelineUserEmail = signal<string | null>(null);

  protected readonly assigneeFilterOptions = computed(() => {
    const options = new Map<string, any>();

    for (const staff of this.staffAccounts()) {
      options.set(staff.email, {
        email: staff.email,
        displayName: staff.displayName || staff.email,
        imageUrl: staff.imageUrl || null
      });
    }

    const inc = this.incident();
    if (inc && inc.assignee) {
      const email = inc.assignee;
      if (!options.has(email)) {
        const prof = this.assigneeProfile();
        options.set(email, {
          email: email,
          displayName: prof ? prof.displayName : (inc.assigneeName || email.split('@')[0]),
          imageUrl: prof ? prof.imageUrl : (inc.assigneeImageUrl || null)
        });
      }
    }

    const profiles = Array.from(options.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
    return [
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

  // AI Analysis local states
  protected readonly isAnalyzing = signal(false);

  // Create ticket form states
  protected readonly showTicketForm = signal(false);
  protected ticketTitle = '';
  protected ticketDesc = '';
  protected ticketPriority = TicketPriority.MEDIUM;
  protected readonly ticketAssigneeEmail = signal<string>('UNASSIGNED');
  protected readonly uploadedImages = signal<Array<{ fileKey: string; previewUrl: string }>>([]);
  protected readonly isImageUploading = signal(false);
  protected readonly selectedLightboxImage = signal<string | null>(null);

  protected readonly ticketPriorityOptions = [
    { value: TicketPriority.LOW, label: 'LOW (Thấp)' },
    { value: TicketPriority.MEDIUM, label: 'MEDIUM (Trung bình)' },
    { value: TicketPriority.HIGH, label: 'HIGH (Cao)' },
    { value: TicketPriority.CRITICAL, label: 'CRITICAL (Nghiêm trọng)' }
  ];

  ngOnInit(): void {
    this.loadIncidentDetails();
    this.loadStaffAccounts();
  }
  protected displayHttpMethod(inc: SystemIncident): string {
    return inc.httpMethod?.trim() || 'HTTP';
  }

  protected displayApiPath(inc: SystemIncident): string {
    const apiPath = inc.apiPath?.trim();
    if (apiPath) {
      return this.normalizeApiPath(apiPath);
    }
    return inc.issueSignature ? 'Issue-generated incident' : 'Chưa có API path';
  }

  protected displayStatusCode(inc: SystemIncident): number | null {
    return typeof inc.statusCode === 'number' && Number.isFinite(inc.statusCode) ? inc.statusCode : null;
  }

  protected hasLinkedIssue(inc: SystemIncident): boolean {
    return !!inc.issueSignature?.trim();
  }

  protected navigateToLinkedIssue(inc: SystemIncident): void {
    const issueSignature = inc.issueSignature?.trim();
    if (!issueSignature) {
      return;
    }

    const issueTime = this.getIncidentIssueTime(inc);
    const queryParams: Record<string, string | number> = {
      issueSignature,
      issueStatus: 'LINKED'
    };

    if (issueTime) {
      const sixHours = 6 * 60 * 60 * 1000;
      queryParams['range'] = 'CUSTOM';
      queryParams['startTime'] = Math.max(0, issueTime.getTime() - sixHours);
      queryParams['endTime'] = Math.min(Date.now(), issueTime.getTime() + sixHours);
    } else {
      queryParams['range'] = 'HOURS_24';
    }

    this.router.navigate(['/admin/issues'], { queryParams });
  }

  private getIncidentIssueTime(inc: SystemIncident): Date | null {
    const rawDate = inc.occurredAt || inc.firstOccurredAt || inc.createdAt;
    if (!rawDate) {
      return null;
    }

    const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
    return Number.isFinite(date.getTime()) ? date : null;
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
          firstOccurredAt: inc.firstOccurredAt ? new Date(inc.firstOccurredAt) : undefined,
          createdAt: inc.createdAt ? new Date(inc.createdAt) : undefined,
          resolvedAt: inc.resolvedAt ? new Date(inc.resolvedAt) : undefined
        };
        this.incident.set(mappedInc);
        this.isLoading.set(false);

        const occurrencesList = mappedInc.occurrences || [];
        const traceIdToSelect = occurrencesList.length > 0 ? occurrencesList[0].traceId : (mappedInc.traceId || null);
        this.selectedTraceId.set(traceIdToSelect);

        const affectedEmailsList = mappedInc.affectedUserEmails || [];
        const emailToSelect = affectedEmailsList.length > 0 ? affectedEmailsList[0] : (mappedInc.userEmail || null);
        this.selectedTimelineUserEmail.set(emailToSelect);

        // 1. Tải logs liên quan từ Loki bằng traceId đang chọn
        if (traceIdToSelect) {
          this.store.loadLogs({ level: 'ALL', search: '', traceId: traceIdToSelect });
        }

        // 2. Tải activity logs của user đang chọn
        if (emailToSelect) {
          this.loadUserActivities(emailToSelect);
        }

        // Tải danh sách khách hàng bị ảnh hưởng
        if (mappedInc.affectedUserEmails && mappedInc.affectedUserEmails.length > 0) {
          this.loadAffectedUserProfiles(mappedInc.affectedUserEmails);
        } else if (mappedInc.userEmail) {
          this.loadAffectedUserProfiles([mappedInc.userEmail]);
        } else {
          this.affectedUserProfiles.set([]);
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

  protected selectTraceId(traceId: string): void {
    this.selectedTraceId.set(traceId);
    this.store.loadLogs({ level: 'ALL', search: '', traceId: traceId });

    // Đồng bộ: Tìm phiên lỗi có traceId này để tự động chọn và tải timeline của khách hàng tương ứng
    const inc = this.incident();
    if (inc && inc.occurrences) {
      const occ = inc.occurrences.find((o: any) => o.traceId === traceId);
      if (occ && occ.userEmail) {
        this.selectedTimelineUserEmail.set(occ.userEmail);
        this.loadUserActivities(occ.userEmail);
      } else {
        this.selectedTimelineUserEmail.set(null);
        this.userActivityLogs.set([]);
      }
    }
  }

  protected selectTimelineUser(email: string): void {
    this.selectedTimelineUserEmail.set(email);
    this.loadUserActivities(email);

    // Đồng bộ: Tìm phiên lỗi mới nhất của khách hàng này để chọn trong dropdown và tải logs Loki tương ứng
    const inc = this.incident();
    if (inc && inc.occurrences) {
      const occ = inc.occurrences.find((o: any) => o.userEmail === email);
      if (occ && occ.traceId) {
        this.selectedTraceId.set(occ.traceId);
        this.store.loadLogs({ level: 'ALL', search: '', traceId: occ.traceId });
      }
    }
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

  private loadAffectedUserProfiles(emails: string[]): void {
    if (!emails || emails.length === 0) {
      this.affectedUserProfiles.set([]);
      return;
    }
    // Use a map to track profiles by email, preserving original order
    const profileMap = new Map<string, { displayName: string; email: string; imageUrl: string | null }>();
    emails.forEach(email => profileMap.set(email, {
      displayName: email.includes('@') ? email.split('@')[0] : email,
      email,
      imageUrl: null
    }));
    let completed = 0;

    emails.forEach(email => {
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
            profileMap.set(email, {
              displayName: account.displayName || account.email,
              email: account.email,
              imageUrl: account.imageUrl || null
            });
          }
          completed++;
          if (completed === emails.length) {
            // Preserve original order from emails array (first affected = first in list)
            this.affectedUserProfiles.set(emails.map(e => profileMap.get(e)!).filter(Boolean));
          }
        },
        error: () => {
          completed++;
          if (completed === emails.length) {
            this.affectedUserProfiles.set(emails.map(e => profileMap.get(e)!).filter(Boolean));
          }
        }
      });
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

  protected getOccurrenceSummaryForEmail(email: string): { count: number; firstTime: Date | null; lastTime: Date | null } {
    const inc = this.incident();
    if (!inc || !inc.occurrences) return { count: 0, firstTime: null, lastTime: null };
    
    const emailOccs = inc.occurrences.filter((o: any) => o.userEmail === email);
    if (emailOccs.length === 0) return { count: 0, firstTime: null, lastTime: null };
    
    const sorted = [...emailOccs].sort((a: any, b: any) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
    return {
      count: sorted.length,
      firstTime: new Date(sorted[0].occurredAt),
      lastTime: new Date(sorted[sorted.length - 1].occurredAt)
    };
  }

  protected getUserOccurrences(email: string): any[] {
    const inc = this.incident();
    if (!inc || !inc.occurrences) return [];
    
    return inc.occurrences
      .filter((o: any) => o.userEmail === email)
      .sort((a: any, b: any) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
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
        
        const msg = res.data?.ticketCode
          ? 'Đã cập nhật trạng thái sự cố và tự động đồng bộ sang Ticket liên kết!'
          : 'Đã cập nhật trạng thái sự cố thành công!';
        this.toastService.success(msg);
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
        
        this.toastService.success('Đã cập nhật mức độ nghiêm trọng sự cố thành công!');
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
      next: (res) => {
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

        const msg = res.data?.ticketCode
          ? 'Đã cập nhật người phụ trách và tự động đồng bộ sang Ticket liên kết!'
          : 'Đã cập nhật người phụ trách thành công!';
        this.toastService.success(msg);
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

    const staff = this.staffAccounts().find((s: any) => s.email === this.ticketAssigneeEmail());
    const assigneeId = staff ? staff.id : undefined;
    const images = this.uploadedImages().map(img => img.fileKey).join(',');

    const payload = {
      title: this.ticketTitle,
      description: this.ticketDesc,
      priority: this.ticketPriority,
      status: TicketStatus.OPEN,
      incidentId: inc.id,
      assigneeId: assigneeId || undefined,
      images: images || undefined
    };

    this.store.createTicketFromIncident(payload, () => {
      this.showTicketForm.set(false);
      this.uploadedImages.set([]);
      this.ticketAssigneeEmail.set('UNASSIGNED');
      // Reload để cập nhật mã ticket liên kết
      this.loadIncidentDetails();
    });
  }

  protected toggleTicketForm(): void {
    const inc = this.incident();
    if (!inc) return;

    this.ticketTitle = `Sửa lỗi sự cố ${inc.code}: ${inc.errorMessage || 'Lỗi hệ thống'}`;
    const statusText = this.displayStatusCode(inc) ? `HTTP ${this.displayStatusCode(inc)}` : 'Không xác định';
    this.ticketDesc = `Sự cố phát sinh tại API: ${this.displayHttpMethod(inc)} ${this.displayApiPath(inc)}\nTrạng thái lỗi: ${statusText}\nThông điệp: ${inc.errorMessage}\n\nVui lòng kiểm tra nguyên nhân gốc và khắc phục.`;
    this.ticketAssigneeEmail.set('UNASSIGNED');
    this.uploadedImages.set([]);
    this.showTicketForm.set(!this.showTicketForm());
  }

  protected onPasteImage(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          this.uploadImageFile(file);
        }
      }
    }
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      for (let i = 0; i < input.files.length; i++) {
        this.uploadImageFile(input.files[i]);
      }
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      for (let i = 0; i < event.dataTransfer.files.length; i++) {
        const file = event.dataTransfer.files[i];
        if (file.type.startsWith('image/')) {
          this.uploadImageFile(file);
        }
      }
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private uploadImageFile(file: File): void {
    this.isImageUploading.set(true);
    this.adminProfileService.requestTicketAttachmentUploadPresign(file).subscribe({
      next: (presign: AdminUploadPresignResponseDto) => {
        this.adminProfileService.uploadToR2(presign, file).subscribe({
          next: () => {
            const previewUrl = URL.createObjectURL(file);
            this.uploadedImages.update(list => [...list, { fileKey: presign.fileKey, previewUrl }]);
            this.isImageUploading.set(false);
            this.toastService.success('Đã tải lên hình ảnh đính kèm');
          },
          error: (err: unknown) => {
            console.error('Failed to upload file to R2', err);
            this.isImageUploading.set(false);
            this.toastService.error('Tải hình ảnh lên máy chủ lưu trữ thất bại');
          }
        });
      },
      error: (err: unknown) => {
        console.error('Failed to request presigned upload URL', err);
        this.isImageUploading.set(false);
        this.toastService.error('Yêu cầu cổng tải ảnh thất bại');
      }
    });
  }

  protected removeUploadedImage(fileKey: string): void {
    this.uploadedImages.update(list => list.filter(img => img.fileKey !== fileKey));
  }

  protected openLightbox(url: string): void {
    this.selectedLightboxImage.set(url);
  }

  protected closeLightbox(): void {
    this.selectedLightboxImage.set(null);
  }

  protected getImagesList(imagesStr: string | undefined): string[] {
    if (!imagesStr) return [];
    return imagesStr.split(',').map(img => img.trim()).filter(img => !!img);
  }

  // System Log detail view handlers
  protected openSystemLogDetails(log: SystemLog): void {
    this.selectedSystemLog.set(log);
  }

  protected closeSystemLogDetails(): void {
    this.selectedSystemLog.set(null);
  }

  protected getSystemLogViewMode(logId: string): 'structured' | 'raw' {
    return this.systemLogViewModeMap()[logId] || 'structured';
  }

  protected setSystemLogViewMode(logId: string, mode: 'structured' | 'raw'): void {
    this.systemLogViewModeMap.update(map => ({ ...map, [logId]: mode }));
  }

  protected handleExplainLog(logItem: SystemLog): void {
    const logId = logItem.id;
    if (this.explanations()[logId] || this.explainingIds()[logId]) return;

    this.explainingIds.update(map => ({ ...map, [logId]: true }));

    this.store.explainLog(
      logItem.message,
      logItem.details,
      logItem.category || LogServiceCategory.BACKEND,
      (explanation) => {
        this.explanations.update(map => ({ ...map, [logId]: explanation }));
        this.explainingIds.update(map => ({ ...map, [logId]: false }));
      },
      () => {
        this.explainingIds.update(map => ({ ...map, [logId]: false }));
      }
    );
  }

  protected copyToClipboard(text: string, event?: Event, successMsg: string = 'Đã sao chép nội dung log!'): void {
    if (event) {
      event.stopPropagation();
    }
    navigator.clipboard.writeText(text).then(() => {
      this.toastService.success(successMsg);
    });
  }

  protected getStructuredMetadata(log: SystemLog): LogMetadataItem[] {
    const stackContext = this.parseClientLogStack(log.details);
    const metadata: LogMetadataItem[] = [
      { label: 'detected_level', value: log.level.toLowerCase() },
      { label: 'source', value: log.category },
      { label: 'timestamp', value: this.formatLogDateTime(log.timestamp) },
    ];

    if (log.traceId) {
      metadata.push({ label: 'trace_id', value: log.traceId });
    }

    if (stackContext?.eventType) {
      metadata.push({ label: 'event_type', value: stackContext.eventType });
    }

    if (stackContext?.routeUrl) {
      metadata.push({ label: 'route_url', value: stackContext.routeUrl });
    }

    if (stackContext?.method) {
      metadata.push({ label: 'method', value: stackContext.method });
    }

    if (stackContext?.apiPath) {
      metadata.push({ label: 'api_path', value: stackContext.apiPath });
    }

    if (stackContext?.statusCode !== undefined) {
      metadata.push({ label: 'status_code', value: String(stackContext.statusCode) });
    }

    if (stackContext?.reason) {
      metadata.push({ label: 'reason', value: stackContext.reason });
    }

    return metadata;
  }

  protected getIndexedLabels(log: SystemLog): LogMetadataItem[] {
    const service = this.normalizeServiceCategory(log.category);
    const filename = service === LogServiceCategory.AI_SERVICE
      ? '/logs/ai.log'
      : service === LogServiceCategory.FRONTEND
        ? '/logs/frontend.log'
        : '/logs/backend.log';

    return [
      { label: 'service', value: service.toLowerCase() },
      { label: 'service_name', value: service.toLowerCase() },
      { label: 'filename', value: filename },
    ];
  }

  protected getUserJourney(log: SystemLog): LogJourneyItem[] {
    const currentContext = this.parseClientLogStack(log.details);
    const currentTime = new Date(log.timestamp).getTime();
    const journeyWindowMs = 10 * 60 * 1000;

    return this.store.logs()
      .filter(candidate => this.isJourneyCandidate(candidate, log, currentContext, currentTime, journeyWindowMs))
      .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
      .slice(-8)
      .map(candidate => this.toJourneyItem(candidate, log.id));
  }

  private isJourneyCandidate(
    candidate: SystemLog,
    currentLog: SystemLog,
    currentContext: ClientLogStackContext | null,
    currentTime: number,
    journeyWindowMs: number
  ): boolean {
    const candidateTime = new Date(candidate.timestamp).getTime();

    if (candidateTime > currentTime || currentTime - candidateTime > journeyWindowMs) {
      return false;
    }

    if (candidate.id === currentLog.id) {
      return true;
    }

    if (currentLog.traceId && candidate.traceId === currentLog.traceId) {
      return true;
    }

    const candidateContext = this.parseClientLogStack(candidate.details);

    if (currentContext?.routeUrl && candidateContext?.routeUrl === currentContext.routeUrl) {
      return true;
    }

    return this.normalizeServiceCategory(candidate.category) === LogServiceCategory.FRONTEND;
  }

  private toJourneyItem(log: SystemLog, currentLogId: string): LogJourneyItem {
    const context = this.parseClientLogStack(log.details);
    const title = this.toFriendlyJourneyTitle(context?.eventType, log.message);
    const routeText = context?.routeUrl ? `Route: ${context.routeUrl}` : '';
    const apiText = context?.apiPath ? `API: ${context.method || 'HTTP'} ${this.normalizeApiPath(context.apiPath)}` : '';
    const reasonText = context?.reason ? `Reason: ${context.reason}` : '';
    const description = [routeText, apiText, reasonText].filter(Boolean).join(' · ') || log.message;

    return {
      id: log.id,
      time: new Date(log.timestamp),
      title,
      description,
      level: log.level,
      category: log.category,
      isCurrent: log.id === currentLogId,
    };
  }

  private toFriendlyJourneyTitle(eventType: string | undefined, fallbackMessage: string): string {
    switch (eventType) {
      case 'HttpRequestSucceeded':
        return 'Gọi API thành công';
      case 'HttpRequestFailed':
        return 'Gọi API thất bại';
      case 'RouteNavigated':
        return 'Điều hướng trang';
      case 'ProductViewed':
        return 'Xem sản phẩm';
      case 'CartItemAdded':
        return 'Thêm sản phẩm vào giỏ';
      case 'AuthLoginSucceeded':
        return 'Đăng nhập thành công';
      case 'AuthLoginFailed':
        return 'Đăng nhập thất bại';
      case 'RouteGuardDenied':
        return 'Bị chặn truy cập';
      default:
        return eventType || fallbackMessage.split('|')[0]?.trim() || fallbackMessage;
    }
  }

  private normalizeApiPath(apiPath: string): string {
    try {
      const url = new URL(apiPath);
      return url.pathname;
    } catch {
      return apiPath;
    }
  }

  private formatLogDateTime(value: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour12: false,
    }).format(new Date(value));
  }

  private normalizeServiceCategory(category: string): LogServiceCategory {
    const normalizedCategory = category.toUpperCase();

    if (normalizedCategory === LogServiceCategory.FRONTEND) {
      return LogServiceCategory.FRONTEND;
    }

    if (normalizedCategory === LogServiceCategory.AI_SERVICE || normalizedCategory === 'AI_SERVICE') {
      return LogServiceCategory.AI_SERVICE;
    }

    return LogServiceCategory.BACKEND;
  }

  private parseClientLogStack(details: string): ClientLogStackContext | null {
    const stackMarker = 'Stack:';
    const stackStartIndex = details.indexOf(stackMarker);

    if (stackStartIndex < 0) {
      return null;
    }

    const rawStack = details.slice(stackStartIndex + stackMarker.length).trim();

    if (!rawStack.startsWith('{')) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawStack) as unknown;

      if (typeof parsed !== 'object' || parsed === null) {
        return null;
      }

      return parsed as ClientLogStackContext;
    } catch {
      return null;
    }
  }

  // Activity Log detail view handlers & helpers
  protected openActivityLogDetails(log: ActivityLog): void {
    this.selectedActivityLog.set(log);
  }

  protected closeActivityLogDetails(): void {
    this.selectedActivityLog.set(null);
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
