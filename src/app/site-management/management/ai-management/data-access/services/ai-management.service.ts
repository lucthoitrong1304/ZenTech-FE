import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ApiService } from '../../../../../core/api/api.service';
import {
  AiDataset,
  AiDatasetPayload,
  AiDemoResult,
  AiDocument,
  AiProductVectorFilter,
  AiProductVectorStatus,
  ApiResponseDto,
} from '../models/ai-management.models';

@Injectable({
  providedIn: 'root',
})
export class AiManagementService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/management/ai`;

  getDatasets(): Observable<AiDataset[]> {
    return this.apiService
      .get<ApiResponseDto<AiDataset[]>>(`${this.baseUrl}/datasets`)
      .pipe(map(unwrapApiResponse));
  }

  createDataset(payload: AiDatasetPayload): Observable<AiDataset> {
    return this.apiService
      .post<AiDatasetPayload, ApiResponseDto<AiDataset>>(`${this.baseUrl}/datasets`, normalizeDatasetPayload(payload))
      .pipe(map(unwrapApiResponse));
  }

  updateDataset(datasetId: string, payload: AiDatasetPayload): Observable<AiDataset> {
    return this.apiService
      .patch<AiDatasetPayload, ApiResponseDto<AiDataset>>(`${this.baseUrl}/datasets/${datasetId}`, normalizeDatasetPayload(payload))
      .pipe(map(unwrapApiResponse));
  }

  archiveDataset(datasetId: string): Observable<AiDataset> {
    return this.apiService
      .delete<ApiResponseDto<AiDataset>>(`${this.baseUrl}/datasets/${datasetId}`)
      .pipe(map(unwrapApiResponse));
  }

  uploadDocument(datasetId: string, file: File): Observable<AiDocument> {
    const formData = new FormData();
    formData.append('file', file);
    return this.apiService
      .postFormData<ApiResponseDto<AiDocument>>(`${this.baseUrl}/datasets/${datasetId}/documents`, formData)
      .pipe(map(unwrapApiResponse));
  }

  deleteDocument(documentId: string): Observable<AiDocument> {
    return this.apiService
      .delete<ApiResponseDto<AiDocument>>(`${this.baseUrl}/documents/${documentId}`)
      .pipe(map(unwrapApiResponse));
  }

  reingestDocument(documentId: string): Observable<AiDocument> {
    return this.apiService
      .post<Record<string, never>, ApiResponseDto<AiDocument>>(`${this.baseUrl}/documents/${documentId}/reingest`, {})
      .pipe(map(unwrapApiResponse));
  }

  getProductVectorStatuses(filter: AiProductVectorFilter = 'ALL'): Observable<AiProductVectorStatus[]> {
    return this.apiService
      .get<ApiResponseDto<AiProductVectorStatus[]>>(`${this.baseUrl}/products/vector-status?filter=${filter}`)
      .pipe(map(unwrapApiResponse));
  }

  syncProductVariant(variantId: string): Observable<AiProductVectorStatus> {
    return this.apiService
      .post<Record<string, never>, ApiResponseDto<AiProductVectorStatus>>(`${this.baseUrl}/products/variants/${variantId}/sync`, {})
      .pipe(map(unwrapApiResponse));
  }

  verifyProductVariant(variantId: string): Observable<AiProductVectorStatus> {
    return this.apiService
      .post<Record<string, never>, ApiResponseDto<AiProductVectorStatus>>(`${this.baseUrl}/products/variants/${variantId}/verify`, {})
      .pipe(map(unwrapApiResponse));
  }

  verifyAllProducts(): Observable<AiProductVectorStatus[]> {
    return this.apiService
      .post<Record<string, never>, ApiResponseDto<AiProductVectorStatus[]>>(`${this.baseUrl}/products/verify`, {})
      .pipe(map(unwrapApiResponse));
  }

  reindexProducts(): Observable<string> {
    return this.apiService
      .post<Record<string, never>, ApiResponseDto<string>>(`${this.baseUrl}/products/reindex`, {})
      .pipe(map(unwrapApiResponse));
  }

  runDemo(
    message: string,
    history: { role: 'customer' | 'assistant' | 'staff' | 'system'; content: string }[] = []
  ): Observable<AiDemoResult> {
    return this.apiService
      .post<{ message: string; history: { role: 'customer' | 'assistant' | 'staff' | 'system'; content: string }[] }, ApiResponseDto<AiDemoResult>>(
        `${this.baseUrl}/demo`,
        { message, history }
      )
      .pipe(map(unwrapApiResponse));
  }
}

function unwrapApiResponse<T>(response: ApiResponseDto<T>): T {
  if (!response.success) {
    throw new Error(response.message || 'Khong the xu ly yeu cau AI.');
  }
  return response.data;
}

function normalizeDatasetPayload(payload: AiDatasetPayload): AiDatasetPayload {
  return {
    ...payload,
    description: normalizeText(payload.description),
  };
}

function normalizeText(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
