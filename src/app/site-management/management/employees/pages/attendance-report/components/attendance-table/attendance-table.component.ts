import { Component, computed, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AttendanceRecordResponse } from '../../../../../data-access/models/attendance.model';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';

@Component({
  selector: 'app-attendance-table',
  standalone: true,
  imports: [CommonModule, DatePipe, LucideChevronLeft, LucideChevronRight],
  template: `
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr>
            <th class="bg-gray-50 text-gray-500 font-medium text-sm py-3 px-4 border-b border-gray-200">Nhân viên</th>
            <th class="bg-gray-50 text-gray-500 font-medium text-sm py-3 px-4 border-b border-gray-200">Thời gian check-in</th>
            <th class="bg-gray-50 text-gray-500 font-medium text-sm py-3 px-4 border-b border-gray-200">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          @for (record of records(); track record.id) {
            <tr class="border-b border-gray-100 hover:bg-gray-50">
              <td class="py-3 px-4">
                <span class="font-medium text-gray-900">{{ record.employeeName }}</span>
              </td>
              <td class="py-3 px-4 text-gray-600">{{ record.checkInTime | date:'dd/MM/yyyy HH:mm:ss' }}</td>
              <td class="py-3 px-4">
                <span [ngClass]="getStatusBadgeClass(record.status)" 
                      class="px-2 py-1 rounded-full text-xs font-medium">
                  {{ getStatusLabel(record.status) }}
                </span>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="3" class="text-center py-8 text-gray-500">
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
      case 'EARLY': return 'bg-orange-100 text-orange-700';
      case 'MISSED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ON_TIME': return 'Đúng giờ';
      case 'LATE': return 'Đi muộn';
      case 'EARLY': return 'Đi sớm';
      case 'MISSED': return 'Vắng mặt';
      default: return status;
    }
  }
}
