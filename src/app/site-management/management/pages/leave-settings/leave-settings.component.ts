import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideLoader2, LucidePlus, LucideSave } from '@lucide/angular';
import { ApiService } from '../../../../core/api/api.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { environment } from '../../../../../environments/environment';

type LeaveTypeUnit = 'DAY' | 'HOUR';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string | null;
}

interface PageResponse<T> {
  content: T[];
}

interface LeaveType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: LeaveTypeUnit;
  active: boolean;
  systemDefault: boolean;
  sortOrder: number;
}

interface Employee {
  employeeId: string;
  fullName: string;
  email: string;
}

interface LeaveQuota {
  leaveTypeId: string;
  leaveType: LeaveType;
  year: number;
  entitlement: number;
  approvedUsed: number;
  pendingUsed: number;
  remaining: number;
}

@Component({
  selector: 'app-leave-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideLoader2, LucidePlus, LucideSave],
  templateUrl: './leave-settings.component.html',
  styleUrl: './leave-settings.component.css'
})
export class LeaveSettingsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  loading = signal(false);
  savingType = signal(false);
  savingQuotas = signal(false);
  typeModalOpen = signal(false);
  leaveTypes = signal<LeaveType[]>([]);
  employees = signal<Employee[]>([]);
  quotas = signal<LeaveQuota[]>([]);

  activeTypeCount = computed(() => this.leaveTypes().filter(type => type.active).length);
  quotaTotal = computed(() => this.quotas().reduce((total, quota) => total + Number(quota.entitlement || 0), 0));
  quotaApproved = computed(() => this.quotas().reduce((total, quota) => total + Number(quota.approvedUsed || 0), 0));
  selectedEmployee = computed(() => this.employees().find(employee => employee.employeeId === this.selectedEmployeeId) ?? null);

  selectedEmployeeId = '';
  selectedYear = new Date().getFullYear();
  editingTypeId: string | null = null;

  typeDraft = {
    name: '',
    code: '',
    description: '',
    unit: 'DAY' as LeaveTypeUnit,
    active: true,
    sortOrder: 40
  };

  ngOnInit(): void {
    this.loadTypes();
    this.loadEmployees();
  }

  loadTypes(): void {
    this.loading.set(true);
    this.api.get<ApiResponse<LeaveType[]>>(`${environment.apiBaseUrl}/management/leave-types`).subscribe({
      next: response => {
        if (response.success) this.leaveTypes.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Không tải được loại phép.');
        this.loading.set(false);
      }
    });
  }

  loadEmployees(): void {
    this.api.get<ApiResponse<PageResponse<Employee>>>(`${environment.apiBaseUrl}/management/employees`, {
      params: { size: 100, active: true }
    }).subscribe({
      next: response => {
        if (!response.success) return;
        this.employees.set(response.data.content);
        if (!this.selectedEmployeeId && response.data.content.length > 0) {
          this.selectedEmployeeId = response.data.content[0].employeeId;
          this.loadQuotas();
        }
      },
      error: () => this.toast.error('Không tải được danh sách nhân viên.')
    });
  }

  loadQuotas(): void {
    if (!this.selectedEmployeeId) {
      this.quotas.set([]);
      return;
    }
    this.api.get<ApiResponse<LeaveQuota[]>>(
      `${environment.apiBaseUrl}/management/employees/${this.selectedEmployeeId}/leave-quotas`,
      { params: { year: this.selectedYear } }
    ).subscribe({
      next: response => {
        if (response.success) this.quotas.set(response.data);
      },
      error: () => this.toast.error('Không tải được hạn mức.')
    });
  }

  editType(type: LeaveType): void {
    this.editingTypeId = type.id;
    this.typeDraft = {
      name: type.name,
      code: type.code,
      description: type.description ?? '',
      unit: type.unit,
      active: type.active,
      sortOrder: type.sortOrder
    };
    this.typeModalOpen.set(true);
  }

  openCreateTypeDialog(): void {
    this.resetTypeDraft();
    this.typeModalOpen.set(true);
  }

  closeTypeDialog(): void {
    if (this.savingType()) return;
    this.typeModalOpen.set(false);
    this.resetTypeDraft();
  }

  resetTypeDraft(): void {
    this.editingTypeId = null;
    this.typeDraft = {
      name: '',
      code: '',
      description: '',
      unit: 'DAY',
      active: true,
      sortOrder: 40
    };
  }

  saveType(): void {
    if (!this.typeDraft.name.trim()) {
      this.toast.error('Tên loại phép không được để trống.');
      return;
    }

    const payload = { ...this.typeDraft };
    this.savingType.set(true);
    const request$ = this.editingTypeId
      ? this.api.patch<typeof payload, ApiResponse<LeaveType>>(`${environment.apiBaseUrl}/management/leave-types/${this.editingTypeId}`, payload)
      : this.api.post<typeof payload, ApiResponse<LeaveType>>(`${environment.apiBaseUrl}/management/leave-types`, payload);

    request$.subscribe({
      next: response => {
        if (response.success) {
          this.toast.success('Đã lưu loại phép.');
          this.typeModalOpen.set(false);
          this.resetTypeDraft();
          this.loadTypes();
          this.loadQuotas();
        }
        this.savingType.set(false);
      },
      error: error => {
        this.toast.error(error.error?.message || 'Lưu loại phép thất bại.');
        this.savingType.set(false);
      }
    });
  }

  saveQuotas(): void {
    if (!this.selectedEmployeeId) return;
    const payload = {
      quotas: this.quotas().map(quota => ({
        leaveTypeId: quota.leaveTypeId,
        entitlement: Number(quota.entitlement) || 0
      }))
    };
    this.savingQuotas.set(true);
    this.api.patch<typeof payload, ApiResponse<LeaveQuota[]>>(
      `${environment.apiBaseUrl}/management/employees/${this.selectedEmployeeId}/leave-quotas`,
      payload,
      { params: { year: this.selectedYear } }
    ).subscribe({
      next: response => {
        if (response.success) {
          this.quotas.set(response.data);
          this.toast.success('Đã lưu hạn mức.');
        }
        this.savingQuotas.set(false);
      },
      error: error => {
        this.toast.error(error.error?.message || 'Lưu hạn mức thất bại.');
        this.savingQuotas.set(false);
      }
    });
  }

  unitLabel(unit: LeaveTypeUnit): string {
    return unit === 'HOUR' ? 'giờ' : 'ngày';
  }

  typeTone(type: LeaveType): string {
    if (type.code === 'NGHI') return 'type-card--leave';
    if (type.code === 'WFH') return 'type-card--wfh';
    if (type.code === 'AFK') return 'type-card--afk';
    return 'type-card--custom';
  }

  quotaUsagePercent(quota: LeaveQuota): number {
    const entitlement = Number(quota.entitlement || 0);
    if (entitlement <= 0) return 0;
    const used = Number(quota.approvedUsed || 0) + Number(quota.pendingUsed || 0);
    return Math.min(100, Math.max(0, Math.round((used / entitlement) * 100)));
  }
}
