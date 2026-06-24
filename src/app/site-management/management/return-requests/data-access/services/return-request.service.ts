import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import { ReturnRequest } from '../models/return-request.model';
import { ApiResponseDto } from '../../../../account/data-access/models/account.models';

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
