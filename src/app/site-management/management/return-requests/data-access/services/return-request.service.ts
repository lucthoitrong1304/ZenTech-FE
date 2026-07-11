import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@/core/api/api.service';
import { environment } from '@env/environment';
import { ReturnRequest } from '@/site-management/management/return-requests/data-access/models/return-request.model';
import { ApiResponseDto } from '@/core/api/api-response.models';

@Injectable({
  providedIn: 'root',
})
export class ReturnRequestService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/management/return-requests`;

  getReturnRequests(): Observable<ApiResponseDto<ReturnRequest[]>> {
    return this.apiService.get<ApiResponseDto<ReturnRequest[]>>(this.baseUrl);
  }

  approveRequest(id: string, resellable: boolean): Observable<ApiResponseDto<ReturnRequest>> {
    return this.apiService.post<unknown, ApiResponseDto<ReturnRequest>>(
      `${this.baseUrl}/${id}/approve?resellable=${resellable}`,
      {}
    );
  }

  rejectRequest(id: string): Observable<ApiResponseDto<ReturnRequest>> {
    return this.apiService.post<unknown, ApiResponseDto<ReturnRequest>>(
      `${this.baseUrl}/${id}/reject`,
      {}
    );
  }
}
