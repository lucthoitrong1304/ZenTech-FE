import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import {
  InventorySummary,
  InventoryTransaction,
  InventoryAdjustmentRequest,
  InventoryQuery,
  InventoryStats,
  PageResponse,
  ApiResponseDto,
  AiRecommendationResponse,
  InventoryTransactionStats,
} from '../models/inventory.model';

@Injectable({
  providedIn: 'root',
})
export class ManagementInventoryService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = environment.apiBaseUrl;

  getInventorySummary(query: InventoryQuery): Observable<PageResponse<InventorySummary>> {
    const params: Record<string, string | number | boolean> = {
      page: query.page,
      size: query.size,
      sort: query.sort,
      stockStatus: query.stockStatus,
    };
    const keyword = query.keyword.trim();

    if (keyword) {
      params['keyword'] = keyword;
    }

    return this.apiService
      .get<ApiResponseDto<PageResponse<InventorySummary>>>(
        `${this.baseUrl}/management/inventory/summary`,
        { params }
      )
      .pipe(map(unwrapApiResponse));
  }

  getTransactionLogs(query: InventoryQuery): Observable<PageResponse<InventoryTransaction>> {
    const params: Record<string, string | number | boolean> = {
      page: query.page,
      size: query.size,
      sort: 'createdAt,desc', // Default sort for logs
      type: query.type,
    };
    const keyword = query.keyword.trim();

    if (keyword) {
      params['keyword'] = keyword;
    }
    if (query.employeeId) {
      params['employeeId'] = query.employeeId;
    }
    if (query.reason && query.reason !== 'all') {
      params['reason'] = query.reason;
    }
    if (query.startDate) {
      params['startDate'] = query.startDate;
    }
    if (query.endDate) {
      params['endDate'] = query.endDate;
    }

    return this.apiService
      .get<ApiResponseDto<PageResponse<InventoryTransaction>>>(
        `${this.baseUrl}/management/inventory/transactions`,
        { params }
      )
      .pipe(map(unwrapApiResponse));
  }

  getTransactionStats(query: InventoryQuery): Observable<InventoryTransactionStats> {
    const params: Record<string, string | number | boolean> = {
      type: query.type,
    };
    const keyword = query.keyword.trim();

    if (keyword) {
      params['keyword'] = keyword;
    }
    if (query.employeeId) {
      params['employeeId'] = query.employeeId;
    }
    if (query.reason && query.reason !== 'all') {
      params['reason'] = query.reason;
    }
    if (query.startDate) {
      params['startDate'] = query.startDate;
    }
    if (query.endDate) {
      params['endDate'] = query.endDate;
    }

    return this.apiService
      .get<ApiResponseDto<InventoryTransactionStats>>(
        `${this.baseUrl}/management/inventory/transactions/stats`,
        { params }
      )
      .pipe(map(unwrapApiResponse));
  }

  getInventoryStats(): Observable<InventoryStats> {
    return this.apiService
      .get<ApiResponseDto<InventoryStats>>(`${this.baseUrl}/management/inventory/stats`)
      .pipe(map(unwrapApiResponse));
  }

  getAiRecommendations(): Observable<AiRecommendationResponse> {
    return this.apiService
      .get<ApiResponseDto<AiRecommendationResponse>>(`${this.baseUrl}/management/inventory/ai-recommendations`)
      .pipe(map(unwrapApiResponse));
  }

  adjustStock(request: InventoryAdjustmentRequest): Observable<InventoryTransaction> {
    return this.apiService
      .post<InventoryAdjustmentRequest, ApiResponseDto<InventoryTransaction>>(
        `${this.baseUrl}/management/inventory/adjust`,
        request
      )
      .pipe(map(unwrapApiResponse));
  }
}

function unwrapApiResponse<T>(response: ApiResponseDto<T>): T {
  if (!response.success) {
    throw new Error(response.message ?? 'Không thể xử lý yêu cầu.');
  }
  return response.data;
}
