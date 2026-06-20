import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceStatisticsResponse } from '../../../../../data-access/models/attendance.model';
import { LucideUsers, LucideClock, LucideAlertCircle, LucideCheckCircle2, LucideCalendarDays, LucideHeartHandshake } from '@lucide/angular';

@Component({
  selector: 'app-attendance-statistics-cards',
  standalone: true,
  imports: [CommonModule, LucideUsers, LucideClock, LucideAlertCircle, LucideCheckCircle2, LucideCalendarDays, LucideHeartHandshake],
  template: `
    @if (statistics()) {
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <!-- Tổng ngày công -->
        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <svg lucideUsers class="w-5 h-5"></svg>
          </div>
          <div>
            <p class="text-xs text-gray-500 font-medium">Tổng ngày công</p>
            <p class="text-xl font-bold text-gray-900">{{ statistics()!.totalRecords }}</p>
          </div>
        </div>

        <!-- Tổng giờ làm -->
        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <svg lucideClock class="w-5 h-5"></svg>
          </div>
          <div>
            <p class="text-xs text-gray-500 font-medium">Tổng giờ làm</p>
            <p class="text-xl font-bold text-gray-900">{{ statistics()!.totalWorkingHours | number:'1.1-1' }}h</p>
          </div>
        </div>

        <!-- Đúng giờ -->
        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <svg lucideCheckCircle2 class="w-5 h-5"></svg>
          </div>
          <div>
            <p class="text-xs text-gray-500 font-medium">Đúng giờ</p>
            <p class="text-xl font-bold text-gray-900">{{ statistics()!.totalOnTime }}</p>
          </div>
        </div>

        <!-- Đi muộn / Về sớm -->
        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
            <svg lucideAlertCircle class="w-5 h-5"></svg>
          </div>
          <div>
            <p class="text-xs text-gray-500 font-medium">Muộn/Sớm</p>
            <p class="text-xl font-bold text-gray-900">{{ statistics()!.totalLate }}/{{ statistics()!.totalEarly }}</p>
          </div>
        </div>

        <!-- Vắng mặt -->
        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
            <svg lucideCalendarDays class="w-5 h-5"></svg>
          </div>
          <div>
            <p class="text-xs text-gray-500 font-medium">Vắng không phép</p>
            <p class="text-xl font-bold text-gray-900">{{ statistics()!.totalAbsent }}</p>
          </div>
        </div>

        <!-- Nghỉ phép -->
        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
            <svg lucideHeartHandshake class="w-5 h-5"></svg>
          </div>
          <div>
            <p class="text-xs text-gray-500 font-medium">Nghỉ có phép</p>
            <p class="text-xl font-bold text-gray-900">{{ statistics()!.totalLeave }}</p>
          </div>
        </div>
      </div>
    }
  `
})
export class AttendanceStatisticsCardsComponent {
  statistics = input<AttendanceStatisticsResponse | null>(null);
}

