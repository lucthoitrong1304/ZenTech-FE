import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceStatisticsResponse } from '../../../../../data-access/models/attendance.model';
import { LucideUsers, LucideClock, LucideAlertCircle, LucideCheckCircle2 } from '@lucide/angular';

@Component({
  selector: 'app-attendance-statistics-cards',
  standalone: true,
  imports: [CommonModule, LucideUsers, LucideClock, LucideAlertCircle, LucideCheckCircle2],
  template: `
    @if (statistics()) {
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Tổng lượt -->
        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <svg lucideUsers class="w-6 h-6"></svg>
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Tổng lượt check-in</p>
            <p class="text-2xl font-bold text-gray-900">{{ statistics()!.totalRecords }}</p>
          </div>
        </div>

        <!-- Đúng giờ -->
        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <svg lucideCheckCircle2 class="w-6 h-6"></svg>
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Đúng giờ</p>
            <p class="text-2xl font-bold text-gray-900">{{ statistics()!.totalOnTime }}</p>
          </div>
        </div>

        <!-- Đi muộn -->
        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
            <svg lucideAlertCircle class="w-6 h-6"></svg>
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Đi muộn</p>
            <p class="text-2xl font-bold text-gray-900">{{ statistics()!.totalLate }}</p>
          </div>
        </div>

        <!-- Về sớm -->
        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
            <svg lucideClock class="w-6 h-6"></svg>
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Đi sớm (Early)</p>
            <p class="text-2xl font-bold text-gray-900">{{ statistics()!.totalEarly }}</p>
          </div>
        </div>
      </div>
    }
  `
})
export class AttendanceStatisticsCardsComponent {
  statistics = input<AttendanceStatisticsResponse | null>(null);
}
