import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import {
  AdminObservabilityData,
  ObservabilityDependencyDetail,
  ApiResponse,
  DashboardPeriod,
} from '../../dashboard/data-access/dashboard.models';

@Injectable({ providedIn: 'root' })
export class AdminObservabilityService {
  private readonly api = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/observability`;

  getObservability(period: DashboardPeriod, from?: string, to?: string): Observable<ApiResponse<AdminObservabilityData>> {
    let url = `${this.baseUrl}?period=${period}`;
    if (period === 'CUSTOM' && from && to) {
      url += `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    }
    return this.api.get<ApiResponse<AdminObservabilityData>>(url);
  }

  getDependencyDetail(name: string): Observable<ApiResponse<ObservabilityDependencyDetail>> {
    return this.api.get<ApiResponse<ObservabilityDependencyDetail>>(`${this.baseUrl}/dependencies/${encodeURIComponent(name)}`);
  }

  pingDependency(name: string): Observable<ApiResponse<{ status: 'UP' | 'DEGRADED' | 'DOWN'; latencyMs: number }>> {
    return this.api.get<ApiResponse<{ status: 'UP' | 'DEGRADED' | 'DOWN'; latencyMs: number }>>(`${this.baseUrl}/dependencies/${encodeURIComponent(name)}/ping`);
  }
}
