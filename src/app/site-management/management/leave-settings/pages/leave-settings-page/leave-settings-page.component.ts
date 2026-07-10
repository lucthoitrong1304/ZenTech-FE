import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideLoader2, LucidePlus, LucideSave } from '@lucide/angular';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import {
  LeaveQuota,
  LeaveType,
  LeaveTypePayload,
} from '../../data-access/models/leave-settings.models';
import { LeaveSettingsStore } from '../../data-access/store/leave-settings.store';

@Component({
  selector: 'app-leave-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, LucideLoader2, LucidePlus, LucideSave],
  providers: [LeaveSettingsStore],
  templateUrl: './leave-settings-page.component.html',
  styleUrl: './leave-settings-page.component.css',
})
export class LeaveSettingsComponent implements OnInit {
  private readonly store = inject(LeaveSettingsStore);
  private readonly toast = inject(ToastService);
  protected readonly loading = this.store.loading;
  protected readonly savingType = this.store.savingType;
  protected readonly savingQuotas = this.store.savingQuotas;
  protected readonly leaveTypes = this.store.leaveTypes;
  protected readonly employees = this.store.employees;
  protected readonly quotas = this.store.quotas;
  protected readonly typeModalOpen = signal(false);
  protected readonly activeTypeCount = computed(
    () => this.leaveTypes().filter((type) => type.active).length,
  );
  protected readonly quotaTotal = computed(() =>
    this.quotas().reduce((total, quota) => total + Number(quota.entitlement || 0), 0),
  );
  protected readonly quotaApproved = computed(() =>
    this.quotas().reduce((total, quota) => total + Number(quota.approvedUsed || 0), 0),
  );
  protected readonly selectedEmployee = computed(
    () =>
      this.employees().find((employee) => employee.employeeId === this.selectedEmployeeId) ?? null,
  );
  protected selectedEmployeeId = '';
  protected selectedYear = new Date().getFullYear();
  protected editingTypeId: string | null = null;
  protected typeDraft: LeaveTypePayload = {
    name: '',
    code: '',
    description: '',
    unit: 'DAY',
    active: true,
    sortOrder: 40,
  };
  constructor() {
    effect(() => {
      const employees = this.employees();
      if (!this.selectedEmployeeId && employees.length) {
        this.selectedEmployeeId = employees[0].employeeId;
        this.loadQuotas();
      }
    });
  }
  ngOnInit(): void {
    this.store.loadInitial();
  }
  protected loadQuotas(): void {
    if (!this.selectedEmployeeId) return;
    this.store.loadQuotas({ employeeId: this.selectedEmployeeId, year: this.selectedYear });
  }
  protected editType(type: LeaveType): void {
    this.editingTypeId = type.id;
    this.typeDraft = {
      name: type.name,
      code: type.code,
      description: type.description ?? '',
      unit: type.unit,
      active: type.active,
      sortOrder: type.sortOrder,
    };
    this.typeModalOpen.set(true);
  }
  protected openCreateTypeDialog(): void {
    this.resetTypeDraft();
    this.typeModalOpen.set(true);
  }
  protected closeTypeDialog(): void {
    if (!this.savingType()) {
      this.typeModalOpen.set(false);
      this.resetTypeDraft();
    }
  }
  protected saveType(): void {
    if (!this.typeDraft.name.trim()) {
      this.toast.error('Tên loại phép không được để trống.');
      return;
    }
    const quotaQuery = this.selectedEmployeeId
      ? { employeeId: this.selectedEmployeeId, year: this.selectedYear }
      : null;
    this.store.saveType({ id: this.editingTypeId, payload: this.typeDraft, quotaQuery });
    this.typeModalOpen.set(false);
    this.resetTypeDraft();
  }
  protected saveQuotas(): void {
    if (!this.selectedEmployeeId) return;
    this.store.saveQuotas({
      employeeId: this.selectedEmployeeId,
      year: this.selectedYear,
      quotas: this.quotas().map((quota) => ({
        leaveTypeId: quota.leaveTypeId,
        entitlement: Number(quota.entitlement) || 0,
      })),
    });
  }
  protected unitLabel(unit: LeaveType['unit']): string {
    return unit === 'HOUR' ? 'giờ' : 'ngày';
  }
  protected typeTone(type: LeaveType): string {
    return type.code === 'NGHI'
      ? 'type-card--leave'
      : type.code === 'WFH'
        ? 'type-card--wfh'
        : type.code === 'AFK'
          ? 'type-card--afk'
          : 'type-card--custom';
  }
  protected quotaUsagePercent(quota: LeaveQuota): number {
    const entitlement = Number(quota.entitlement || 0);
    return entitlement <= 0
      ? 0
      : Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((Number(quota.approvedUsed || 0) + Number(quota.pendingUsed || 0)) / entitlement) *
                100,
            ),
          ),
        );
  }
  private resetTypeDraft(): void {
    this.editingTypeId = null;
    this.typeDraft = {
      name: '',
      code: '',
      description: '',
      unit: 'DAY',
      active: true,
      sortOrder: 40,
    };
  }
}
