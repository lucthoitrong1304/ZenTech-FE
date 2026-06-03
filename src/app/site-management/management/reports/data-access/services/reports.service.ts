import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ApiService } from '../../../../../core/api/api.service';
import {
  IReportsSummary,
  IRevenuePoint,
  IProductReport,
  ICouponReport,
  ICustomerSegment,
  IAIOpsInsight,
  ReportPeriod,
  IPaymentMethodShare,
  ICategoryShare,
} from '../models/reports.model';

interface ApiResponseDto<T> {
  success: boolean;
  data: T;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/management/reports`;

  getSummary(period: ReportPeriod, customStart?: string, customEnd?: string): Observable<ApiResponseDto<IReportsSummary>> {
    const params = this.buildDateParams(period, customStart, customEnd);
    return this.apiService.get<ApiResponseDto<IReportsSummary>>(`${this.baseUrl}/summary`, { params });
  }

  getRevenueSeries(period: ReportPeriod, customStart?: string, customEnd?: string): Observable<ApiResponseDto<IRevenuePoint[]>> {
    const params = this.buildDateParams(period, customStart, customEnd);
    return this.apiService.get<ApiResponseDto<IRevenuePoint[]>>(`${this.baseUrl}/revenue-series`, { params });
  }

  getProductPerformance(period: ReportPeriod, customStart?: string, customEnd?: string): Observable<ApiResponseDto<IProductReport[]>> {
    const params = this.buildDateParams(period, customStart, customEnd);
    return this.apiService.get<ApiResponseDto<IProductReport[]>>(`${this.baseUrl}/product-performance`, { params });
  }

  getCouponPerformance(period: ReportPeriod, customStart?: string, customEnd?: string): Observable<ApiResponseDto<ICouponReport[]>> {
    const params = this.buildDateParams(period, customStart, customEnd);
    return this.apiService.get<ApiResponseDto<ICouponReport[]>>(`${this.baseUrl}/coupon-performance`, { params });
  }

  getCustomerSegments(period: ReportPeriod, customStart?: string, customEnd?: string): Observable<ApiResponseDto<ICustomerSegment[]>> {
    const params = this.buildDateParams(period, customStart, customEnd);
    return this.apiService.get<ApiResponseDto<ICustomerSegment[]>>(`${this.baseUrl}/customer-segments`, { params });
  }

  getAIOpsInsights(period: ReportPeriod, customStart?: string, customEnd?: string): Observable<ApiResponseDto<IAIOpsInsight[]>> {
    const params = this.buildDateParams(period, customStart, customEnd);
    return this.apiService.get<ApiResponseDto<IAIOpsInsight[]>>(`${this.baseUrl}/ai-insights`, { params });
  }

  getPaymentMethods(period: ReportPeriod, customStart?: string, customEnd?: string): Observable<ApiResponseDto<IPaymentMethodShare[]>> {
    const params = this.buildDateParams(period, customStart, customEnd);
    return this.apiService.get<ApiResponseDto<IPaymentMethodShare[]>>(`${this.baseUrl}/payment-methods`, { params });
  }

  getCategories(period: ReportPeriod, customStart?: string, customEnd?: string): Observable<ApiResponseDto<ICategoryShare[]>> {
    const params = this.buildDateParams(period, customStart, customEnd);
    return this.apiService.get<ApiResponseDto<ICategoryShare[]>>(`${this.baseUrl}/categories`, { params });
  }

  private buildDateParams(period: ReportPeriod, customStart?: string, customEnd?: string): Record<string, string> {
    const params: Record<string, string> = {};
    const now = new Date();
    let startDate: string | null = null;
    let endDate = now.toISOString();

    if (period === ReportPeriod.Today) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = start.toISOString();
    } else if (period === ReportPeriod.Last7Days) {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = start.toISOString();
    } else if (period === ReportPeriod.Last30Days) {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = start.toISOString();
    } else if (period === ReportPeriod.Custom && customStart && customEnd) {
      startDate = new Date(customStart).toISOString();
      endDate = new Date(customEnd).toISOString();
    }

    if (startDate) {
      params['startDate'] = startDate;
    }
    params['endDate'] = endDate;

    return params;
  }
}
