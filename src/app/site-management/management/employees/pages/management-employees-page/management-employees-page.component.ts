import { CommonModule, DatePipe } from '@angular/common';
import { Component, ChangeDetectionStrategy, effect, inject, untracked } from '@angular/core';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideEye,
  LucideFilter,
  LucideLoader2,
  LucideMail,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideUserRound,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import {
  ManagementEmployee,
  ManagementEmployeeRole,
  ManagementEmployeeSort,
} from '../../data-access/models/management-employee.models';
import { ManagementEmployeesStore } from '../../data-access/store/management-employees.store';

type ActiveFilterValue = 'all' | 'active' | 'inactive';
type RoleFilterValue = 'all' | ManagementEmployeeRole;

@Component({
  selector: 'app-management-employees-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    LucideChevronLeft,
    LucideChevronRight,
    LucideEye,
    LucideFilter,
    LucideLoader2,
    LucideMail,
    LucidePencil,
    LucidePlus,
    LucideRefreshCw,
    LucideSearch,
    LucideUserRound,
    LucideUsers,
    LucideX,
  ],
  templateUrl: './management-employees-page.component.html',
  styleUrl: './management-employees-page.component.css',
  providers: [ManagementEmployeesStore],
})
export class ManagementEmployeesPageComponent {
  protected readonly store = inject(ManagementEmployeesStore);
  private readonly toastService = inject(ToastService);
  protected readonly employeeRoles: ManagementEmployeeRole[] = ['MANAGER', 'EMPLOYEE'];
  protected readonly pageSlots = Array.from({ length: 5 }, (_, index) => index);

  constructor() {
    this.store.loadEmployees();

    effect(() => {
      const message = this.store.successMessage();

      if (message) {
        untracked(() => {
          this.toastService.success(message);
          this.store.clearMessages();
        });
      }
    });

    effect(() => {
      const message = this.store.errorMessage();

      if (message) {
        untracked(() => {
          this.toastService.error(message);
          this.store.clearMessages();
        });
      }
    });
  }

  protected onKeywordInput(event: Event): void {
    this.store.setKeyword(readInputValue(event));
  }

  protected onKeywordEnter(event: Event): void {
    event.preventDefault();
    this.store.applyFilters();
  }

  protected onActiveFilterChange(event: Event): void {
    const value = readSelectValue(event) as ActiveFilterValue;
    const active = value === 'all' ? null : value === 'active';

    this.store.setActiveFilter(active);
  }

  protected onRoleFilterChange(event: Event): void {
    const value = readSelectValue(event) as RoleFilterValue;

    this.store.setRoleFilter(value === 'all' ? null : value);
  }

  protected onSortChange(event: Event): void {
    this.store.setSort(readSelectValue(event) as ManagementEmployeeSort);
  }

  protected onCreateDraftInput(field: 'fullName' | 'email', event: Event): void {
    this.store.updateCreateDraft({ [field]: readInputValue(event) });
  }

  protected onCreateRoleChange(event: Event): void {
    const value = readSelectValue(event);
    const role = value === 'MANAGER' || value === 'EMPLOYEE' ? value : '';

    this.store.updateCreateDraft({ role });
  }

  protected submitCreateEmployee(event: Event): void {
    event.preventDefault();
    this.store.createEmployee();
  }

  protected getRoleLabel(role: ManagementEmployeeRole): string {
    return role === 'MANAGER' ? 'Quản lý' : 'Nhân viên';
  }

  protected getStatusLabel(active: boolean): string {
    return active ? 'Đang hoạt động' : 'Chưa kích hoạt / Đã khóa';
  }

  protected getEmployeeInitials(employee: ManagementEmployee): string {
    const initials = employee.fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');

    return initials || 'ZT';
  }

  protected getDisplayIndex(index: number): number {
    return this.store.query().page * this.store.query().size + index + 1;
  }

  protected getPageNumber(slot: number): number | null {
    const totalPages = this.store.totalPages();

    if (totalPages <= 0) {
      return null;
    }

    const currentPage = this.store.query().page;
    const start = Math.min(Math.max(currentPage - 2, 0), Math.max(totalPages - 5, 0));
    const page = start + slot;

    return page < totalPages ? page : null;
  }

  protected failedImages = new Set<string>();

  protected onImageError(employeeId: string): void {
    this.failedImages.add(employeeId);
  }

  protected isImageFailed(employeeId: string): boolean {
    return this.failedImages.has(employeeId);
  }
}

function readInputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : '';
}

function readSelectValue(event: Event): string {
  return event.target instanceof HTMLSelectElement ? event.target.value : '';
}

