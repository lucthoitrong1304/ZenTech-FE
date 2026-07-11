import { HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiService } from '@/core/api/api.service';
import { ApiResponseDto, PageResponseDto } from '@/core/api/api-response.models';
import { CustomerAddressResponse } from '@/site-management/customer/contracts/customer-order.models';
import { CustomerVoucherResponse } from '@/site-management/customer/contracts/customer-checkout.models';
import { CheckoutRequest, CheckoutResponse } from '@/site-management/customer/cart/data-access/models/checkout.model';

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private readonly apiService = inject(ApiService);
  private readonly customerUrl = `${environment.apiBaseUrl}/customers/me`;
  private readonly checkoutUrl = `${environment.apiBaseUrl}/customers/me/checkout`;

  getAddresses(): Observable<ApiResponseDto<CustomerAddressResponse[]>> {
    return this.apiService.get<ApiResponseDto<CustomerAddressResponse[]>>(
      `${this.customerUrl}/addresses`,
    );
  }

  getAvailableVouchers(): Observable<ApiResponseDto<PageResponseDto<CustomerVoucherResponse>>> {
    return this.apiService.get<ApiResponseDto<PageResponseDto<CustomerVoucherResponse>>>(
      `${this.customerUrl}/vouchers?page=0&size=100&sort=issuedAt,desc&status=AVAILABLE`,
    );
  }

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
