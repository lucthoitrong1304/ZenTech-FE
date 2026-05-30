import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import {
  ManagementCoupon,
  ManagementCouponQuery,
  ManagementCouponPage,
  CustomerVoucherDetail,
  CustomerVoucherQuery,
  CustomerVoucherPage,
  MarketingStats,
  CustomerSummary,
  CouponRequest,
  IssueVoucherRequest,
  ApiResponseDto,
  PageResponseDto,
} from '../models/marketing.models';

@Injectable({
  providedIn: 'root',
})
export class MarketingService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/management/coupons`;

  getCoupons(query: ManagementCouponQuery): Observable<ManagementCouponPage> {
    const params: Record<string, string | number | boolean> = {
      page: query.page,
      size: query.size,
      sort: query.sort,
    };
    
    const keyword = query.keyword.trim();
    if (keyword) {
      params['keyword'] = keyword;
    }

    if (query.type !== 'all') {
      params['type'] = query.type;
    }

    if (query.active !== 'all') {
      params['active'] = query.active === true;
    }

    return this.apiService
      .get<ApiResponseDto<PageResponseDto<ManagementCoupon>>>(this.baseUrl, { params })
      .pipe(
        map(response => {
          const data = unwrapApiResponse(response);
          return {
            content: data.content,
            page: data.page,
            size: data.size,
            totalElements: data.totalElements,
            totalPages: data.totalPages,
            last: data.last,
          };
        })
      );
  }

  getCouponDetail(couponId: string): Observable<ManagementCoupon> {
    return this.apiService
      .get<ApiResponseDto<ManagementCoupon>>(`${this.baseUrl}/${couponId}`)
      .pipe(map(unwrapApiResponse));
  }

  createCoupon(request: CouponRequest): Observable<ManagementCoupon> {
    return this.apiService
      .post<CouponRequest, ApiResponseDto<ManagementCoupon>>(this.baseUrl, request)
      .pipe(map(unwrapApiResponse));
  }

  updateCoupon(couponId: string, request: CouponRequest): Observable<ManagementCoupon> {
    return this.apiService
      .patch<CouponRequest, ApiResponseDto<ManagementCoupon>>(`${this.baseUrl}/${couponId}`, request)
      .pipe(map(unwrapApiResponse));
  }

  deleteCoupon(couponId: string): Observable<string> {
    return this.apiService
      .delete<ApiResponseDto<unknown>>(`${this.baseUrl}/${couponId}`)
      .pipe(map(() => couponId));
  }

  toggleCouponActive(couponId: string): Observable<ManagementCoupon> {
    return this.apiService
      .patch<unknown, ApiResponseDto<ManagementCoupon>>(`${this.baseUrl}/${couponId}/toggle-active`, {})
      .pipe(map(unwrapApiResponse));
  }

  getCustomerVouchers(query: CustomerVoucherQuery): Observable<CustomerVoucherPage> {
    const params: Record<string, string | number | boolean> = {
      page: query.page,
      size: query.size,
      sort: query.sort,
    };

    const keyword = query.keyword.trim();
    if (keyword) {
      params['keyword'] = keyword;
    }

    const couponCode = query.couponCode.trim();
    if (couponCode) {
      params['couponCode'] = couponCode;
    }

    if (query.status !== 'all') {
      params['status'] = query.status;
    }

    return this.apiService
      .get<ApiResponseDto<PageResponseDto<CustomerVoucherDetail>>>(`${this.baseUrl}/vouchers`, { params })
      .pipe(
        map(response => {
          const data = unwrapApiResponse(response);
          return {
            content: data.content,
            page: data.page,
            size: data.size,
            totalElements: data.totalElements,
            totalPages: data.totalPages,
            last: data.last,
          };
        })
      );
  }

  issueVouchers(request: IssueVoucherRequest): Observable<void> {
    return this.apiService
      .post<IssueVoucherRequest, ApiResponseDto<unknown>>(`${this.baseUrl}/vouchers/issue`, request)
      .pipe(map(() => undefined));
  }

  deleteCustomerVoucher(customerVoucherId: string): Observable<string> {
    return this.apiService
      .delete<ApiResponseDto<unknown>>(`${this.baseUrl}/vouchers/${customerVoucherId}`)
      .pipe(map(() => customerVoucherId));
  }

  getMarketingStats(): Observable<MarketingStats> {
    return this.apiService
      .get<ApiResponseDto<MarketingStats>>(`${this.baseUrl}/stats`)
      .pipe(map(unwrapApiResponse));
  }

  getCustomers(): Observable<CustomerSummary[]> {
    const params = { page: 0, size: 200, sort: 'fullName,asc' };
    return this.apiService
      .get<ApiResponseDto<PageResponseDto<CustomerSummary>>>(`${environment.apiBaseUrl}/management/customers`, { params })
      .pipe(
        map(response => {
          const data = unwrapApiResponse(response);
          return data.content;
        })
      );
  }
}

function unwrapApiResponse<T>(response: ApiResponseDto<T>): T {
  if (!response.success) {
    throw new Error(response.message ?? 'Đã có lỗi xảy ra.');
  }
  return response.data;
}
