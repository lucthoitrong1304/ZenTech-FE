import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import {
  AccountQuery,
  AccountSummary,
  ApiResponse,
  CreateInternalAccountPayload,
  PageResponse,
  UpdateAccountRolePayload,
  UpdateAccountStatusPayload,
} from '../models/account.model';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly apiService = inject(ApiService);
  private readonly accountsUrl = `${environment.apiBaseUrl}/admin/accounts`;

  getAccounts(query: AccountQuery): Observable<ApiResponse<PageResponse<AccountSummary>>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size)
      .set('sort', `${query.sortField},${query.sortDirection}`);

    const keyword = query.keyword.trim();
    if (keyword.length > 0) {
      params = params.set('keyword', keyword);
    }

    if (query.role !== null) {
      params = params.set('role', query.role);
    }

    if (query.active !== null) {
      params = params.set('active', query.active);
    }

    return this.apiService.get<ApiResponse<PageResponse<AccountSummary>>>(this.accountsUrl, {
      params,
    });
  }

  createInternalAccount(
    payload: CreateInternalAccountPayload
  ): Observable<ApiResponse<void>> {
    return this.apiService.post<CreateInternalAccountPayload, ApiResponse<void>>(
      `${this.accountsUrl}/internal`,
      payload
    );
  }

  updateAccountRole(
    accountId: string,
    payload: UpdateAccountRolePayload
  ): Observable<ApiResponse<void>> {
    return this.apiService.patch<UpdateAccountRolePayload, ApiResponse<void>>(
      `${this.accountsUrl}/${accountId}/role`,
      payload
    );
  }

  updateAccountStatus(
    accountId: string,
    payload: UpdateAccountStatusPayload
  ): Observable<ApiResponse<void>> {
    return this.apiService.patch<UpdateAccountStatusPayload, ApiResponse<void>>(
      `${this.accountsUrl}/${accountId}/status`,
      payload
    );
  }
}
