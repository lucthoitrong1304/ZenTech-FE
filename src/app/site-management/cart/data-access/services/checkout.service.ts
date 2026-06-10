import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiService } from '../../../../core/api/api.service';
import { ApiResponseDto } from '../../../account/data-access/models/account.models';
import { CheckoutRequest, CheckoutResponse } from '../models/checkout.model';

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private readonly apiService = inject(ApiService);
  private readonly checkoutUrl = `${environment.apiBaseUrl}/customers/me/checkout`;

  checkout(payload: CheckoutRequest): Observable<ApiResponseDto<CheckoutResponse>> {
    return this.apiService.post<CheckoutRequest, ApiResponseDto<CheckoutResponse>>(
      this.checkoutUrl,
      payload
    );
  }
}
