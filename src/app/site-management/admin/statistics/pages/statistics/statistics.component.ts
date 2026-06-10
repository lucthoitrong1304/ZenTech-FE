import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAlertCircle,
  LucideCheckCircle,
  LucideUsers,
  LucideLink
} from '@lucide/angular';
import { AdminStore } from '../../../data-access/store/admin.store';

interface DailyErrorData {
  date: string;
  count: number;
}

interface ApiErrorData {
  endpoint: string;
  count: number;
  status: number;
}

interface UserErrorData {
  email: string;
  role: string;
  count: number;
}

@Component({
  selector: 'app-admin-statistics',
  standalone: true,
  imports: [
    CommonModule,
    LucideAlertCircle,
    LucideCheckCircle,
    LucideUsers,
    LucideLink
  ],
  templateUrl: './statistics.component.html',
  styleUrl: './statistics.component.css'
})
export class StatisticsComponent {
  protected readonly store = inject(AdminStore);

  // 1. Biểu đồ lỗi theo ngày (7 ngày gần nhất)
  protected readonly dailyErrors: DailyErrorData[] = [
    { date: '30/05', count: 12 },
    { date: '31/05', count: 8 },
    { date: '01/06', count: 18 },
    { date: '02/06', count: 15 },
    { date: '03/06', count: 9 },
    { date: '04/06', count: 25 },
    { date: '05/06', count: 14 }
  ];

  // 2. API lỗi nhiều nhất
  protected readonly topApiErrors: ApiErrorData[] = [
    { endpoint: '/api/management/chat/conversations', count: 15, status: 502 },
    { endpoint: '/api/customers/payments/momo', count: 9, status: 504 },
    { endpoint: '/api/management/work-schedules', count: 5, status: 400 },
    { endpoint: '/api/management/employees/profile', count: 3, status: 403 },
    { endpoint: '/api/products/search', count: 2, status: 500 }
  ];

  // 3. Top user gặp lỗi
  protected readonly topUsersWithErrors: UserErrorData[] = [
    { email: 'khachhang1@gmail.com', role: 'CUSTOMER', count: 16 },
    { email: 'employee@zentech.local', role: 'EMPLOYEE', count: 6 },
    { email: 'owner@zentech.local', role: 'OWNER', count: 4 },
    { email: 'manager@zentech.local', role: 'MANAGER', count: 2 }
  ];

  // 4. Ticket đã xử lý
  protected getResolvedTicketsCount(): number {
    return this.store.tickets().filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  }

  protected getTotalTicketsCount(): number {
    return this.store.tickets().length;
  }

  protected getTicketSuccessRate(): number {
    const total = this.getTotalTicketsCount();
    if (total === 0) return 0;
    return Math.round((this.getResolvedTicketsCount() / total) * 100);
  }

  // Helper properties to draw SVG Chart
  protected get chartMaxVal(): number {
    return Math.max(...this.dailyErrors.map(d => d.count)) + 5;
  }

  protected get chartPointsString(): string {
    const width = 500;
    const height = 150;
    const padding = 20;

    const points = this.dailyErrors.map((d, index) => {
      const x = padding + (index * (width - 2 * padding)) / (this.dailyErrors.length - 1);
      const y = height - padding - (d.count * (height - 2 * padding)) / this.chartMaxVal;
      return `${x},${y}`;
    });

    return points.join(' ');
  }
}
