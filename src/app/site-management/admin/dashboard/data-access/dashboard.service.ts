import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import {
  AdminDashboardData,
  AdminResourceMetrics,
  ApiResponse,
  DashboardPeriod,
} from './dashboard.models';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly api = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/dashboard`;

  getDashboard(period: DashboardPeriod, from?: string, to?: string): Observable<ApiResponse<AdminDashboardData>> {
    let url = `${this.baseUrl}?period=${period}`;
    if (period === 'CUSTOM' && from && to) {
      url += `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    }
    return this.api.get<ApiResponse<AdminDashboardData>>(url);
  }

  getResources(period: DashboardPeriod, from?: string, to?: string): Observable<ApiResponse<AdminResourceMetrics>> {
    let url = `${this.baseUrl}/resources?period=${period}`;
    if (period === 'CUSTOM' && from && to) {
      url += `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    }
    return this.api.get<ApiResponse<AdminResourceMetrics>>(url);
  }
}
