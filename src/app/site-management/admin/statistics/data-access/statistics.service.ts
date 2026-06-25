import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import { AdminStatisticsData, ApiResponse, StatisticsPeriod } from './statistics.models';

@Injectable({ providedIn: 'root' })
export class AdminStatisticsService {
  private readonly api = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/statistics`;

  getStatistics(
    period: StatisticsPeriod,
    from?: string,
    to?: string,
  ): Observable<ApiResponse<AdminStatisticsData>> {
    let url = `${this.baseUrl}?period=${period}`;
    if (period === 'CUSTOM' && from && to) {
      url += `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    }
    return this.api.get<ApiResponse<AdminStatisticsData>>(url);
  }
}
