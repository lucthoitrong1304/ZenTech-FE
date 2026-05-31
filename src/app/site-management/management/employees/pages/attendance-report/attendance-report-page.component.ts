import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceReportStore } from '../../../data-access/store/attendance-report.store';
import { AttendanceStatisticsCardsComponent } from './components/attendance-statistics-cards/attendance-statistics-cards.component';
import { AttendanceTableComponent } from './components/attendance-table/attendance-table.component';
import { LucideAlertCircle } from '@lucide/angular';

@Component({
  selector: 'app-attendance-report',
  standalone: true,
  imports: [CommonModule, FormsModule, AttendanceStatisticsCardsComponent, AttendanceTableComponent, LucideAlertCircle],
  template: `
    <div class="flex flex-col gap-6 p-6">
      <!-- Header & Filters -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Báo cáo chấm công</h1>
          <p class="text-gray-500 text-sm mt-1">Theo dõi thống kê và chi tiết lịch sử chấm công.</p>
        </div>
        
        <div class="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700">Từ:</label>
            <input type="date" [(ngModel)]="startDate" class="text-sm text-gray-700 border-none focus:ring-0 cursor-pointer bg-transparent" />
          </div>
          <div class="h-6 w-px bg-gray-200"></div>
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700">Đến:</label>
            <input type="date" [(ngModel)]="endDate" class="text-sm text-gray-700 border-none focus:ring-0 cursor-pointer bg-transparent" />
          </div>
          <button (click)="onFilter()" 
                  class="bg-[#FFC700] hover:bg-[#FFD633] text-gray-900 font-medium px-4 py-2 rounded-full transition-colors text-sm ml-2">
            Lọc dữ liệu
          </button>
        </div>
      </div>

      @if (store.isLoading()) {
        <div class="flex justify-center p-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4F46E5]"></div>
        </div>
      } @else if (store.error()) {
        <div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <svg lucideAlertCircle class="w-6 h-6"></svg>
          <div>
            <h3 class="font-bold">Đã có lỗi xảy ra</h3>
            <p class="text-sm">{{ store.error() }}</p>
          </div>
        </div>
      } @else {
        <!-- Statistics Cards -->
        <app-attendance-statistics-cards [statistics]="store.statistics()"></app-attendance-statistics-cards>

        <!-- Data Table -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="p-4 border-b border-gray-200">
            <h2 class="font-semibold text-gray-900">Chi tiết chấm công</h2>
          </div>
          <app-attendance-table 
            [records]="store.records()"
            [totalRecords]="store.totalRecords()"
            [page]="store.page()"
            [size]="store.size()"
            (pageChange)="onPageChange($event)">
          </app-attendance-table>
        </div>
      }
    </div>
  `
})
export class AttendanceReportPageComponent implements OnInit {
  protected readonly store = inject(AttendanceReportStore);

  // For the date inputs
  startDate = this.store.startDate();
  endDate = this.store.endDate();

  ngOnInit() {
    this.store.loadReport();
  }

  onFilter() {
    this.store.updateFilter(this.startDate, this.endDate);
    this.store.loadReport();
  }

  onPageChange(event: { page: number, size: number }) {
    this.store.updatePagination(event.page, event.size);
    this.store.loadReport();
  }
}
