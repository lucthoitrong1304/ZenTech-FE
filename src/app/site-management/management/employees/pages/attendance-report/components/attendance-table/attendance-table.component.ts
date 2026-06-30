import { Component, ChangeDetectionStrategy, computed, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  AttendanceRecordResponse,
  AttendanceShiftBreakdownResponse,
} from '../../../../../data-access/models/attendance.model';
import { LucideChevronLeft, LucideChevronRight, LucideChevronDown, LucideChevronUp } from '@lucide/angular';

interface GroupedDateRecord {
  date: string;
  records: AttendanceRecordResponse[];
}

@Component({
  selector: 'app-attendance-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronDown,
    LucideChevronUp
  ],
  templateUrl: './attendance-table.component.html',
  styleUrl: './attendance-table.component.css'
})
export class AttendanceTableComponent {
  records = input.required<AttendanceRecordResponse[]>();
  totalRecords = input.required<number>();
  page = input.required<number>();
  size = input.required<number>();

  pageChange = output<{page: number, size: number}>();

  expandedRows = signal<Set<string>>(new Set());

  groupedRecords = computed<GroupedDateRecord[]>(() => {
    const groups: { [key: string]: AttendanceRecordResponse[] } = {};
    for (const r of this.records()) {
      const dateKey = r.workDate;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(r);
    }
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(dateKey => ({
        date: dateKey,
        records: groups[dateKey]
      }));
  });

  toggleRow(id: string) {
    const set = new Set(this.expandedRows());
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    this.expandedRows.set(set);
  }

  isExpanded(id: string): boolean {
    return this.expandedRows().has(id);
  }

  pageStart = computed(() => {
    if (this.totalRecords() === 0) return 0;
    return this.page() * this.size() + 1;
  });

  pageEnd = computed(() => {
    const end = (this.page() + 1) * this.size();
    return end > this.totalRecords() ? this.totalRecords() : end;
  });

  onPageChange(newPage: number) {
    this.pageChange.emit({ page: newPage, size: this.size() });
  }

  getStatusBadgeClass(status: string): string {
    if (status && status.startsWith('WFH_')) {
      return 'bg-green-50 text-green-700 border border-green-200';
    }
    switch (status) {
      case 'ON_TIME': return 'bg-green-100 text-green-700';
      case 'LATE': return 'bg-red-100 text-red-700';
      case 'EARLY_CHECKOUT': return 'bg-amber-100 text-amber-700';
      case 'LATE_AND_EARLY': return 'bg-orange-100 text-orange-700';
      case 'MISSING_CHECK_IN': return 'bg-purple-100 text-purple-700';
      case 'MISSING_CHECK_OUT': return 'bg-blue-100 text-blue-700';
      case 'NOT_STARTED': return 'bg-slate-100 text-slate-700';
      case 'ABSENT_UNEXCUSED': return 'bg-rose-100 text-rose-700';
      case 'ABSENT_EXCUSED': return 'bg-teal-100 text-teal-700';
      case 'OFF': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  getStatusLabel(status: string): string {
    if (status && status.startsWith('WFH_')) {
      const rest = status.substring(4);
      return 'WFH - ' + this.getStatusLabel(rest);
    }
    switch (status) {
      case 'ON_TIME': return 'Đúng giờ';
      case 'LATE': return 'Đi muộn';
      case 'EARLY_CHECKOUT': return 'Về sớm';
      case 'LATE_AND_EARLY': return 'Trễ & Sớm';
      case 'MISSING_CHECK_IN': return 'Thiếu Check-in';
      case 'MISSING_CHECK_OUT': return 'Thiếu Check-out';
      case 'NOT_STARTED': return 'Chưa tới ca';
      case 'ABSENT_UNEXCUSED': return 'Vắng không phép';
      case 'ABSENT_EXCUSED': return 'Nghỉ có phép';
      case 'OFF': return 'Ngày nghỉ';
      default: return status;
    }
  }

  getDisplayStatus(record: AttendanceRecordResponse): string {
    if (
      record.status === 'ABSENT_UNEXCUSED' &&
      (record.checkInTime || record.checkOutTime)
    ) {
      if (record.checkInTime && !record.checkOutTime && this.isToday(record.workDate)) {
        return 'MISSING_CHECK_OUT';
      }
      if (record.lateMinutes > 0 && record.earlyMinutes > 0) {
        return 'LATE_AND_EARLY';
      }
      if (record.lateMinutes > 0) {
        return 'LATE';
      }
      if (record.earlyMinutes > 0) {
        return 'EARLY_CHECKOUT';
      }
      return 'ON_TIME';
    }

    return record.status;
  }

  getEventLabel(type: string): string {
    switch (type) {
      case 'CHECK_IN': return 'Vào (Check-in)';
      case 'CHECK_OUT': return 'Ra (Check-out)';
      case 'ADJUSTMENT': return 'Chỉnh công';
      case 'MANUAL': return 'Ghi nhận thủ công';
      case 'IMPORT': return 'Import dữ liệu';
      case 'FACE': return 'Xác thực khuôn mặt';
      default: return type;
    }
  }
  formatScheduleTime(time: string | null): string {
    return time ? time.slice(0, 5) : '--:--';
  }

  formatPenaltyMinutes(minutes: number): string {
    if (!minutes || minutes <= 0) return '0m';
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = minutes / 60.0;
    return `${hours.toFixed(1)}h`;
  }
  isLiveRecord(record: AttendanceRecordResponse): boolean {
    return !!(
      record.isProvisional ||
      (
        record.status === 'MISSING_CHECK_OUT' &&
        record.checkInTime &&
        !record.checkOutTime &&
        this.isToday(record.workDate)
      )
    );
  }

  getDisplayWorkingHours(record: AttendanceRecordResponse): number {
    if (this.isLiveRecord(record) && record.checkInTime) {
      return this.hoursBetweenNow(record.checkInTime);
    }
    return record.workingHours ?? 0;
  }

  isLiveShift(shift: AttendanceShiftBreakdownResponse, workDate: string): boolean {
    return !!(
      shift.isProvisional ||
      (
        shift.status === 'MISSING_CHECK_OUT' &&
        shift.checkInTime &&
        !shift.checkOutTime &&
        this.isToday(workDate)
      )
    );
  }

  getDisplayShiftWorkingHours(shift: AttendanceShiftBreakdownResponse, workDate: string): number {
    if (this.isLiveShift(shift, workDate) && shift.checkInTime) {
      return this.hoursBetweenNow(shift.checkInTime);
    }
    return shift.workingHours ?? 0;
  }

  private hoursBetweenNow(startTime: string): number {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    if (!Number.isFinite(start) || now <= start) {
      return 0;
    }
    return (now - start) / 1000 / 60 / 60;
  }

  private isToday(date: string): boolean {
    const today = new Date();
    const month = `${today.getMonth() + 1}`.padStart(2, '0');
    const day = `${today.getDate()}`.padStart(2, '0');
    return date === `${today.getFullYear()}-${month}-${day}`;
  }
}
