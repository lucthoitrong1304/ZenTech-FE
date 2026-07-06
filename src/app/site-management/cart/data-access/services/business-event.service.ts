import { HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { ApiService } from '../../../../core/api/api.service';

export enum BusinessEventType {
  VIEW_PRODUCT = 'VIEW_PRODUCT',
  ADD_TO_CART = 'ADD_TO_CART',
  CHECKOUT_START = 'CHECKOUT_START',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
}

export interface BusinessEventRequest {
  eventType: BusinessEventType;
  amount?: number;
  traceId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class BusinessEventService {
  private readonly apiService = inject(ApiService);
  private readonly url = `${environment.apiBaseUrl}/business-events`;

  record(payload: BusinessEventRequest): void {
    // Fire-and-forget: không block luồng chính, lỗi cũng không ảnh hưởng UX
    this.apiService
      .post<BusinessEventRequest, unknown>(this.url, payload, {
        headers: this.createTraceHeaders(payload.traceId),
      })
      .subscribe({ error: () => {} });
  }

  private createTraceHeaders(traceId?: string): HttpHeaders | undefined {
    return traceId ? new HttpHeaders({ 'X-Trace-Id': traceId }) : undefined;
  }
}
