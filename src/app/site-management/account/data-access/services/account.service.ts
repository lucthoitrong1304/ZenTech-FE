import { HttpContext, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/api/api.service';
import { SKIP_AUTH_TOKEN, SKIP_GLOBAL_ERROR } from '../../../../core/tokens/api-context.token';
import { environment } from '../../../../../environments/environment';
import {
  ApiResponseDto,
  PageResponseDto,
  AccountProfile,
  UpdateMyProfileRequest,
  CustomerAddressResponse,
  CustomerAddressRequest,
  CustomerOrderHistoryResponse,
  CustomerOrderDetailResponse,
  CustomerVoucherResponse,
  UploadPresignRequestDto,
  UploadPresignResponseDto,
} from '../models/account.models';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/customers/me`;
  private readonly uploadsUrl = `${environment.apiBaseUrl}/uploads`;

  getProfile(): Observable<ApiResponseDto<AccountProfile>> {
    return this.apiService.get<ApiResponseDto<AccountProfile>>(`${this.baseUrl}/profile`);
  }

  updateProfile(payload: UpdateMyProfileRequest): Observable<ApiResponseDto<AccountProfile>> {
    return this.apiService.patch<UpdateMyProfileRequest, ApiResponseDto<AccountProfile>>(
      `${this.baseUrl}/profile`,
      payload
    );
  }

  getAddresses(): Observable<ApiResponseDto<CustomerAddressResponse[]>> {
    return this.apiService.get<ApiResponseDto<CustomerAddressResponse[]>>(`${this.baseUrl}/addresses`);
  }

  createAddress(payload: CustomerAddressRequest): Observable<ApiResponseDto<CustomerAddressResponse>> {
    return this.apiService.post<CustomerAddressRequest, ApiResponseDto<CustomerAddressResponse>>(
      `${this.baseUrl}/addresses`,
      payload
    );
  }

  updateAddress(
    addressId: string,
    payload: CustomerAddressRequest
  ): Observable<ApiResponseDto<CustomerAddressResponse>> {
    return this.apiService.put<CustomerAddressRequest, ApiResponseDto<CustomerAddressResponse>>(
      `${this.baseUrl}/addresses/${addressId}`,
      payload
    );
  }

  setDefaultAddress(addressId: string): Observable<ApiResponseDto<CustomerAddressResponse>> {
    return this.apiService.patch<unknown, ApiResponseDto<CustomerAddressResponse>>(
      `${this.baseUrl}/addresses/${addressId}/default`,
      {}
    );
  }

  deleteAddress(addressId: string): Observable<ApiResponseDto<void>> {
    return this.apiService.delete<ApiResponseDto<void>>(`${this.baseUrl}/addresses/${addressId}`);
  }

  getOrders(
    page: number,
    size: number,
    sort: string,
    status?: string
  ): Observable<ApiResponseDto<PageResponseDto<CustomerOrderHistoryResponse>>> {
    let url = `${this.baseUrl}/orders?page=${page}&size=${size}&sort=${sort}`;
    if (status) {
      url += `&status=${status}`;
    }
    return this.apiService.get<ApiResponseDto<PageResponseDto<CustomerOrderHistoryResponse>>>(url);
  }

  getOrderDetail(orderId: string): Observable<ApiResponseDto<CustomerOrderDetailResponse>> {
    return this.apiService.get<ApiResponseDto<CustomerOrderDetailResponse>>(
      `${this.baseUrl}/orders/${orderId}`
    );
  }

  getVouchers(
    page: number,
    size: number,
    sort: string,
    status?: string
  ): Observable<ApiResponseDto<PageResponseDto<CustomerVoucherResponse>>> {
    let url = `${this.baseUrl}/vouchers?page=${page}&size=${size}&sort=${sort}`;
    if (status) {
      url += `&status=${status}`;
    }
    return this.apiService.get<ApiResponseDto<PageResponseDto<CustomerVoucherResponse>>>(url);
  }

  requestAvatarUploadPresign(
    filename: string,
    contentType: string,
    fileSize: number
  ): Observable<UploadPresignResponseDto> {
    const payload: UploadPresignRequestDto = {
      originalFilename: filename,
      contentType,
      fileSize,
      purpose: 'CUSTOMER_AVATAR',
    };
    return this.apiService.post<UploadPresignRequestDto, UploadPresignResponseDto>(
      `${this.uploadsUrl}/presign`,
      payload
    );
  }

  requestReturnEvidenceUploadPresign(
    filename: string,
    contentType: string,
    fileSize: number
  ): Observable<UploadPresignResponseDto> {
    const payload: UploadPresignRequestDto = {
      originalFilename: filename,
      contentType,
      fileSize,
      purpose: 'RETURN_EVIDENCE',
    };
    return this.apiService.post<UploadPresignRequestDto, UploadPresignResponseDto>(
      `${this.uploadsUrl}/presign`,
      payload
    );
  }

  submitReturnRequest(
    orderId: string,
    payload: { reason: string; details: string; proofFileKeys: string }
  ): Observable<ApiResponseDto<unknown>> {
    return this.apiService.post<unknown, ApiResponseDto<unknown>>(
      `${this.baseUrl}/orders/${orderId}/return`,
      payload
    );
  }

  uploadToR2(presign: UploadPresignResponseDto, file: File): Observable<string> {
    return this.apiService.putFile(presign.presignedUrl, file, {
      headers: new HttpHeaders(presign.requiredHeaders),
      context: new HttpContext().set(SKIP_AUTH_TOKEN, true).set(SKIP_GLOBAL_ERROR, true),
    });
  }
}
