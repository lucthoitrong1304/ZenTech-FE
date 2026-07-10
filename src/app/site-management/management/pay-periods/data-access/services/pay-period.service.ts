import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import { CreatePayPeriodPayload, PayPeriod, PayPeriodResponse } from '../models/pay-period.models';

@Injectable({ providedIn: 'root' })
export class PayPeriodService {
  private readonly api = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/management/pay-periods`;

  getPeriods(): Observable<PayPeriodResponse<PayPeriod[]>> {
    return this.api.get<PayPeriodResponse<PayPeriod[]>>(this.baseUrl);
  }

  createPeriod(payload: CreatePayPeriodPayload): Observable<PayPeriodResponse<PayPeriod>> {
    return this.api.post<CreatePayPeriodPayload, PayPeriodResponse<PayPeriod>>(this.baseUrl, payload);
  }

  setLocked(id: string, locked: boolean): Observable<PayPeriodResponse<PayPeriod>> {
    return this.api.post<null, PayPeriodResponse<PayPeriod>>(`${this.baseUrl}/${id}/lock`, null, {
      params: { lock: String(locked) },
    });
  }
}
