import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideActivity,
  LucideCpu,
  LucideDatabase,
  LucideServer,
  LucideAlertCircle,
  LucideTicket
} from '@lucide/angular';
import { AdminStore } from '../../../data-access/store/admin.store';
import { LogLevel, IncidentStatus } from '../../../data-access/models/admin.models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideActivity,
    LucideCpu,
    LucideDatabase,
    LucideServer,
    LucideAlertCircle,
    LucideTicket
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  protected readonly store = inject(AdminStore);
  protected readonly LogLevel = LogLevel;
  protected readonly IncidentStatus = IncidentStatus;

  // Mock server info metrics
  protected readonly cpuUsage = 24; // %
  protected readonly ramUsage = 64; // %
  protected readonly diskUsage = 42; // %
  protected readonly apiUptime = '99.98%';
  protected readonly systemUptime = '14 ngày, 6 giờ';
}
