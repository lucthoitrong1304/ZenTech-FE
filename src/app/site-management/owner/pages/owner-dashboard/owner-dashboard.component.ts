import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  LucideCircleAlert,
  LucideEllipsisVertical,
  LucideSearch,
  LucideSparkles,
  LucideTrendingUp,
} from '@lucide/angular';

interface OwnerMetric {
  label: string;
  value: string;
  note: string;
  tone: 'dark' | 'light' | 'alert';
}

interface OwnerOrder {
  code: string;
  product: string;
  customer: string;
  status: string;
  statusTone: 'pending' | 'success' | 'risk';
  total: string;
}

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    LucideCircleAlert,
    LucideEllipsisVertical,
    LucideSearch,
    LucideSparkles,
    LucideTrendingUp,
  ],
  templateUrl: './owner-dashboard.component.html',
  styleUrl: './owner-dashboard.component.css',
})
export class OwnerDashboardComponent {
  protected readonly metrics: OwnerMetric[] = [
    {
      label: 'Tổng doanh thu',
      value: '245.600K',
      note: '+12.4% so với 7 ngày trước',
      tone: 'dark',
    },
    {
      label: 'Khách hàng mới',
      value: '342',
      note: '26.8% từ nguồn organic',
      tone: 'light',
    },
    {
      label: 'Tổng đơn hàng',
      value: '522',
      note: 'Chu kỳ xử lý: 14.6 giờ',
      tone: 'light',
    },
    {
      label: 'AIOps alerts tổng',
      value: '2',
      note: '1 cần xử lý sớm',
      tone: 'alert',
    },
  ];

  protected readonly chartBars = [32, 48, 45, 56, 74, 96, 62, 72, 58, 78, 52, 46];

  protected readonly activities = [
    'Cập nhật hệ thống giá đã triển khai',
    'Cảnh báo tồn kho: Quantum CPU dưới ngưỡng',
    'Đồng bộ hoá dữ liệu thành công',
  ];

  protected readonly orders: OwnerOrder[] = [
    {
      code: '#ZT-40612',
      product: 'Neural-Link Hub v2',
      customer: 'Elena Rodriguez',
      status: 'Đang đợi',
      statusTone: 'pending',
      total: '$2,499.00',
    },
    {
      code: '#ZT-40513',
      product: 'ZenBook Ultra Pro',
      customer: 'Marcus Chen',
      status: 'Đã giao',
      statusTone: 'success',
      total: '$1,850.00',
    },
    {
      code: '#ZT-40518',
      product: 'Eon-Watch S4',
      customer: 'Sarah Jenkins',
      status: 'Đang xử lý',
      statusTone: 'risk',
      total: '$499.00',
    },
  ];
}
