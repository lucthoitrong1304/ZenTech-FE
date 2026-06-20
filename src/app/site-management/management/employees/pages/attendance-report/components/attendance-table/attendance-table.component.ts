import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { AttendanceRecordResponse } from '../../../../../data-access/models/attendance.model';
import { LucideChevronLeft, LucideChevronRight, LucideChevronDown, LucideChevronUp } from '@lucide/angular';

interface GroupedDateRecord {
  date: string;
  records: AttendanceRecordResponse[];
}

@Component({
  selector: 'app-attendance-table',
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
  template: `
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr>
            <th class="bg-gray-50 text-gray-500 font-medium text-sm py-3 px-4 border-b border-gray-200">Nhân viên</th>
            <th class="bg-gray-50 text-gray-500 font-medium text-sm py-3 px-4 border-b border-gray-200">Ca</th>
            <th class="bg-gray-50 text-gray-500 font-medium text-sm py-3 px-4 border-b border-gray-200">Giờ vào</th>
            <th class="bg-gray-50 text-gray-500 font-medium text-sm py-3 px-4 border-b border-gray-200">Giờ ra</th>
            <th class="bg-gray-50 text-gray-500 font-medium text-sm py-3 px-4 border-b border-gray-200">Giờ làm</th>
            <th class="bg-gray-50 text-gray-500 font-medium text-sm py-3 px-4 border-b border-gray-200">Trễ/Sớm</th>
            <th class="bg-gray-50 text-gray-500 font-medium text-sm py-3 px-4 border-b border-gray-200">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          @for (group of groupedRecords(); track group.date) {
            <!-- Date Separator Header Row -->
            <tr>
              <td colspan="7" class="bg-gray-100/80 font-bold text-gray-700 text-sm py-2 px-4 border-y border-gray-200 select-none">
                📅 Ngày {{ group.date | date:'dd/MM/yyyy' }}
              </td>
            </tr>

            @for (record of group.records; track record.id) {
              <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <!-- Employee Name + Chevron Toggle -->
                <td class="py-3.5 px-4 flex items-center gap-2">
                  <button (click)="toggleRow(record.id)" 
                          class="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors flex items-center justify-center">
                    @if (isExpanded(record.id)) {
                      <svg lucideChevronUp class="w-4 h-4"></svg>
                    } @else {
                      <svg lucideChevronDown class="w-4 h-4"></svg>
                    }
                  </button>
                  <span class="font-medium text-gray-900">{{ record.employeeName }}</span>
                </td>
                <td class="py-3.5 px-4 text-gray-600">
                  <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-medium">{{ record.shiftName }}</span>
                </td>
                <td class="py-3.5 px-4 text-gray-600">
                  {{ record.checkInTime ? (record.checkInTime | date:'HH:mm:ss') : '--:--:--' }}
                </td>
                <td class="py-3.5 px-4 text-gray-600">
                  {{ record.checkOutTime ? (record.checkOutTime | date:'HH:mm:ss') : '--:--:--' }}
                </td>
                <td class="py-3.5 px-4 text-gray-600 font-semibold">
                  {{ record.workingHours | number:'1.1-2' }}h
                </td>
                <td class="py-3.5 px-4 text-gray-600 text-xs">
                  <div class="flex flex-col gap-0.5">
                    @if (record.lateMinutes > 0) {
                      <span class="text-red-500 font-medium">Trễ: {{ record.lateMinutes }}m</span>
                    }
                    @if (record.earlyMinutes > 0) {
                      <span class="text-amber-500 font-medium">Sớm: {{ record.earlyMinutes }}m</span>
                    }
                    @if (record.lateMinutes === 0 && record.earlyMinutes === 0) {
                      <span class="text-gray-400">--</span>
                    }
                  </div>
                </td>
                <td class="py-3.5 px-4">
                  <span [ngClass]="getStatusBadgeClass(record.status)" 
                        class="px-2.5 py-1 rounded-full text-xs font-semibold">
                    {{ getStatusLabel(record.status) }}
                  </span>
                </td>
              </tr>

              <!-- Expandable Row: Detailed Event Timeline -->
              @if (isExpanded(record.id)) {
                <tr class="bg-gray-50/40">
                  <td colspan="7" class="p-6 border-b border-gray-200">
                    <div class="flex flex-col gap-4 max-w-lg ml-8">
                      <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Chi tiết dòng thời gian trong ngày</h4>
                      
                      <div class="relative border-l-2 border-dashed border-gray-200 pl-6 ml-3 flex flex-col gap-5">
                        
                        <!-- Ca làm việc -->
                        <div class="relative">
                          <span class="absolute -left-[31px] top-0.5 w-4 h-4 bg-indigo-50 border-2 border-indigo-500 rounded-full flex items-center justify-center">
                            <span class="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                          </span>
                          <div class="flex flex-col">
                            <span class="text-xs text-gray-500 font-medium">Ca làm việc hiệu lực</span>
                            <strong class="text-sm text-gray-800">{{ record.shiftName }}</strong>
                          </div>
                        </div>

                        <!-- Cặp mốc thời gian chấm công thô -->
                        @if (record.detailTimes && record.detailTimes.length > 0) {
                          @for (timeStr of record.detailTimes; track timeStr; let idx = $index) {
                            <div class="relative">
                              <span class="absolute -left-[31px] top-0.5 w-4 h-4 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center">
                                <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                              </span>
                              <div class="flex flex-col">
                                <span class="text-xs text-gray-500 font-medium">
                                  Lần {{ getPairIndex(idx) }} · {{ idx % 2 === 0 ? 'VÀO (Check-in)' : 'RA (Check-out)' }}
                                </span>
                                <strong class="text-sm text-gray-800">
                                  {{ timeStr | date:'HH:mm:ss' }}
                                </strong>
                              </div>
                            </div>
                          }
                        } @else {
                          <div class="relative">
                            <span class="absolute -left-[31px] top-0.5 w-4 h-4 bg-red-50 border-2 border-red-500 rounded-full flex items-center justify-center">
                              <span class="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                            </span>
                            <div class="flex flex-col">
                              <span class="text-xs text-red-500 font-medium">Không có dữ liệu chấm công</span>
                              <strong class="text-sm text-gray-500">Không tìm thấy sự kiện check-in/out nào.</strong>
                            </div>
                          </div>
                        }

                        <!-- Tổng kết ngày -->
                        <div class="relative">
                          <span class="absolute -left-[31px] top-0.5 w-4 h-4 bg-amber-50 border-2 border-amber-500 rounded-full flex items-center justify-center">
                            <span class="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                          </span>
                          <div class="flex flex-col">
                            <span class="text-xs text-gray-500 font-medium">Tổng kết công</span>
                            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm">
                              <span class="text-gray-700">Giờ làm việc thực tế: <strong class="text-gray-900">{{ record.workingHours | number:'1.1-2' }}h</strong></span>
                              @if (record.lateMinutes > 0) {
                                <span class="text-red-600 font-medium">Trễ: {{ record.lateMinutes }}m</span>
                              }
                              @if (record.earlyMinutes > 0) {
                                <span class="text-amber-600 font-medium">Sớm: {{ record.earlyMinutes }}m</span>
                              }
                              <span class="px-2 py-0.5 rounded text-xs font-semibold" [ngClass]="getStatusBadgeClass(record.status)">
                                {{ getStatusLabel(record.status) }}
                              </span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </td>
                </tr>
              }
            }
          } @empty {
            <tr>
              <td colspan="7" class="text-center py-8 text-gray-500">
                Không có dữ liệu chấm công.
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between p-4 border-t border-gray-200 bg-white">
      <span class="text-sm text-gray-600">
        Hiển thị {{ pageStart() }} đến {{ pageEnd() }} trong tổng số {{ totalRecords() }} mục
      </span>
      <div class="flex items-center gap-2">
        <button 
          class="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
          [disabled]="page() === 0"
          (click)="onPageChange(page() - 1)">
          <svg lucideChevronLeft class="w-5 h-5"></svg>
        </button>
        <span class="text-sm font-medium text-gray-700">Trang {{ page() + 1 }}</span>
        <button 
          class="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
          [disabled]="pageEnd() >= totalRecords()"
          (click)="onPageChange(page() + 1)">
          <svg lucideChevronRight class="w-5 h-5"></svg>
        </button>
      </div>
    </div>
  `
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
