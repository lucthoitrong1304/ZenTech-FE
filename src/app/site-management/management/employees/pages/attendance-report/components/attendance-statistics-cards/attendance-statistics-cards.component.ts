import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceStatisticsResponse } from '../../../../../data-access/models/attendance.model';
import { LucideUsers, LucideClock, LucideAlertCircle, LucideCheckCircle2, LucideCalendarDays, LucideHeartHandshake } from '@lucide/angular';

@Component({
  selector: 'app-attendance-statistics-cards',
  standalone: true,
  imports: [CommonModule, LucideUsers, LucideClock, LucideAlertCircle, LucideCheckCircle2, LucideCalendarDays, LucideHeartHandshake],
  templateUrl: './attendance-statistics-cards.component.html',
  styleUrl: './attendance-statistics-cards.component.css'
})
export class AttendanceStatisticsCardsComponent {
  statistics = input<AttendanceStatisticsResponse | null>(null);
}

