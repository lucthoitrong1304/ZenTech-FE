import { Component, ChangeDetectionStrategy, computed, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { AttendanceRecordResponse } from '../../../../../data-access/models/attendance.model';
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

  // Group records by Date
  groupedRecords = computed<GroupedDateRecord[]>(() => {
    const groups: { [key: string]: AttendanceRecordResponse[] } = {};
    for (const r of this.records()) {
      const dateKey = r.workDate;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(r);
    }
    // Sort dates descending
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

  getPairIndex(index: number): number {
    return Math.floor(index / 2) + 1;
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
    switch (status) {
      case 'ON_TIME': return 'bg-green-100 text-green-700';
      case 'LATE': return 'bg-red-100 text-red-700';
      case 'EARLY_CHECKOUT': return 'bg-amber-100 text-amber-700';
      case 'LATE_AND_EARLY': return 'bg-orange-100 text-orange-700';
      case 'MISSING_CHECK_IN': return 'bg-purple-100 text-purple-700';
      case 'MISSING_CHECK_OUT': return 'bg-blue-100 text-blue-700';
      case 'ABSENT_UNEXCUSED': return 'bg-rose-100 text-rose-700';
      case 'ABSENT_EXCUSED': return 'bg-teal-100 text-teal-700';
      case 'OFF': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ON_TIME': return 'Đúng giờ';
      case 'LATE': return 'Đi muộn';
      case 'EARLY_CHECKOUT': return 'Về sớm';
      case 'LATE_AND_EARLY': return 'Trễ & Sớm';
      case 'MISSING_CHECK_IN': return 'Thiếu Check-in';
      case 'MISSING_CHECK_OUT': return 'Thiếu Check-out';
      case 'ABSENT_UNEXCUSED': return 'Vắng không phép';
      case 'ABSENT_EXCUSED': return 'Nghỉ có phép';
      case 'OFF': return 'Ngày nghỉ';
      default: return status;
    }
  }
}
