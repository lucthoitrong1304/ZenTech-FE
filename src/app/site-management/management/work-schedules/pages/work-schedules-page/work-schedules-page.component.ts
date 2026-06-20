import { CommonModule, DatePipe } from '@angular/common';
import { Component, effect, inject, untracked } from '@angular/core';
import {
  LucideCalendarDays,
  LucideCheck,
  LucideChevronLeft,
  LucideChevronRight,
  LucideClock3,
  LucideCopy,
  LucideLoader2,
  LucideRefreshCw,
  LucideSearch,
  LucideSettings,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import {
  DailyShift,
  EmployeeWeeklySchedule,
  Shift,
  ShiftType,
} from '../../data-access/models/work-schedule.models';
import { WorkScheduleStore } from '../../data-access/store/work-schedule.store';

@Component({
  selector: 'app-work-schedules-page',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    LucideCalendarDays,
    LucideCheck,
    LucideChevronLeft,
    LucideChevronRight,
    LucideClock3,
    LucideCopy,
    LucideLoader2,
    LucideRefreshCw,
    LucideSearch,
    LucideSettings,
    LucideUsers,
    LucideX,
  ],
  templateUrl: './work-schedules-page.component.html',
  styleUrl: './work-schedules-page.component.css',
  providers: [WorkScheduleStore],
})
export class WorkSchedulesPageComponent {
  protected readonly store = inject(WorkScheduleStore);
  private readonly toastService = inject(ToastService);
  protected readonly pageSlots = Array.from({ length: 5 }, (_, index) => index);

  constructor() {
    this.store.loadWorkspace();

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

  protected onReasonInput(event: Event): void {
    this.store.setReason(readInputValue(event));
  }


  protected onKeywordEnter(event: Event): void {
    event.preventDefault();
    this.store.applyFilters();
  }

  protected onAssignShiftChange(event: Event): void {
    this.store.setAssignShift(readSelectValue(event));
  }

  protected onBulkShiftChange(event: Event): void {
    this.store.updateBulkDraft({ shiftId: readSelectValue(event) });
  }

  protected onBulkDateInput(field: 'startDate' | 'endDate', event: Event): void {
    this.store.updateBulkDraft({ [field]: readInputValue(event) });
  }

  protected onBulkSelectAllChange(event: Event): void {
    this.store.updateBulkDraft({ selectAll: readCheckboxValue(event) });
  }

  protected onCopyWeekStartInput(field: 'fromWeekStartDate' | 'toWeekStartDate', event: Event): void {
    this.store.setCopyWeekStart(field, readInputValue(event));
  }

  protected onShiftTimeInput(shiftId: string, field: 'startTime' | 'endTime', event: Event): void {
    this.store.updateShiftDraft(shiftId, { [field]: normalizeTime(readInputValue(event)) });
  }

  protected onNewShiftInput(field: 'name' | 'colorCode' | 'type', event: Event): void {
    const value = field === 'type' ? readSelectValue(event) : readInputValue(event);
    this.store.updateNewShiftDraft({ [field]: value });
  }

  protected onNewShiftTimeInput(field: 'startTime' | 'endTime', event: Event): void {
    this.store.updateNewShiftDraft({ [field]: normalizeTime(readInputValue(event)) });
  }

  protected getShiftForDate(employee: EmployeeWeeklySchedule, workDate: string): DailyShift | null {
    return employee.shifts.find(shift => shift.workDate === workDate) ?? null;
  }

  protected getDayLabel(workDate: string): string {
    const date = new Date(`${workDate}T00:00:00`);
    const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    return labels[date.getDay()];
  }

  protected getShiftTypeLabel(type: ShiftType): string {
    switch (type) {
      case 'OFF':
        return 'Nghỉ';
      case 'DEFAULT':
        return 'Mặc định';
      default:
        return 'Làm việc';
    }
  }

  protected getShiftTimeRange(shift: Pick<Shift | DailyShift, 'startTime' | 'endTime'>): string {
    if (!shift.startTime && !shift.endTime) {
      return 'Ca linh hoạt';
    }

    return `${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`;
  }

  protected getEmployeeInitials(employeeName: string): string {
    const initials = employeeName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');

    return initials || 'ZT';
  }

  protected isEmployeeSelected(employeeId: string): boolean {
    return this.store.selectedEmployeeIds().includes(employeeId);
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
}

function readInputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : '';
}

function readSelectValue(event: Event): string {
  return event.target instanceof HTMLSelectElement ? event.target.value : '';
}

function readCheckboxValue(event: Event): boolean {
  return event.target instanceof HTMLInputElement ? event.target.checked : false;
}

function normalizeTime(value: string): string | null {
  return value ? `${value}:00` : null;
}

function formatTime(value: string | null): string {
  return value ? value.slice(0, 5) : '--:--';
}
