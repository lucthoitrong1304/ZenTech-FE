import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '@/core/api/api.service';
import { CustomerOrderDetailResponse } from '@/site-management/customer/contracts/customer-order.models';
import { environment } from '@env/environment';

export interface CheckoutResultResponse {
  success: boolean;
  data: CustomerOrderDetailResponse;
  message: string | null;
}

@Injectable({ providedIn: 'root' })
export class CheckoutResultService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/customers/me/orders`;

  getOrderDetail(orderId: string): Observable<CheckoutResultResponse> {
    return this.apiService.get<CheckoutResultResponse>(`${this.baseUrl}/${orderId}`);
  }
}
