import { HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiService } from '@/core/api/api.service';
import { ApiResponseDto } from '@/site-management/customer/account/data-access/models/account.models';
import { CheckoutRequest, CheckoutResponse } from '@/site-management/customer/cart/data-access/models/checkout.model';

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private readonly apiService = inject(ApiService);
  private readonly checkoutUrl = `${environment.apiBaseUrl}/customers/me/checkout`;

  checkout(payload: CheckoutRequest, traceId?: string): Observable<ApiResponseDto<CheckoutResponse>> {
    return this.apiService.post<CheckoutRequest, ApiResponseDto<CheckoutResponse>>(
      this.checkoutUrl,
      payload,
      { headers: this.createTraceHeaders(traceId) }
    );
  }

  private createTraceHeaders(traceId?: string): HttpHeaders | undefined {
    return traceId ? new HttpHeaders({ 'X-Trace-Id': traceId }) : undefined;
  }
}
