import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import {
  ApiResponseDto,
  EmployeeSummaryResponseDto,
  OwnerEmployee,
  OwnerEmployeeCreateRequest,
  OwnerEmployeePage,
  OwnerEmployeeQuery,
  PageResponseDto,
} from '../models/owner-employee.models';

@Injectable({
  providedIn: 'root',
})
export class OwnerEmployeeService {
  private readonly apiService = inject(ApiService);
  private readonly employeesBaseUrl = `${environment.apiBaseUrl}/owner/employees`;

  getEmployees(query: OwnerEmployeeQuery): Observable<OwnerEmployeePage> {
    const params: Record<string, string | number | boolean> = {
      page: query.page,
      size: query.size,
      sort: query.sort,
    };
    const keyword = query.keyword.trim();

    if (keyword) {
      params['keyword'] = keyword;
    }

    if (query.active !== null) {
      params['active'] = query.active;
    }

    if (query.role) {
      params['role'] = query.role;
    }

    return this.apiService
      .get<ApiResponseDto<PageResponseDto<EmployeeSummaryResponseDto>>>(this.employeesBaseUrl, {
        params,
      })
      .pipe(map(response => toOwnerEmployeePage(unwrapApiResponse(response))));
  }

  createEmployee(payload: OwnerEmployeeCreateRequest): Observable<OwnerEmployee> {
    return this.apiService
      .post<OwnerEmployeeCreateRequest, ApiResponseDto<EmployeeSummaryResponseDto>>(
        this.employeesBaseUrl,
        payload
      )
      .pipe(map(response => toOwnerEmployee(unwrapApiResponse(response))));
  }
}

function unwrapApiResponse<T>(response: ApiResponseDto<T>): T {
  if (!response.success) {
    throw new Error(response.message ?? 'Khong the xu ly yeu cau.');
  }

  return response.data;
}

function toOwnerEmployeePage(response: PageResponseDto<EmployeeSummaryResponseDto>): OwnerEmployeePage {
  return {
    employees: response.content.map(toOwnerEmployee),
    page: response.page,
    size: response.size,
    totalElements: response.totalElements,
    totalPages: response.totalPages,
    last: response.last,
  };
}

function toOwnerEmployee(response: EmployeeSummaryResponseDto): OwnerEmployee {
  return {
    employeeId: response.employeeId,
    accountId: response.accountId,
    email: response.email,
    fullName: response.fullName,
    imageUrl: response.imageUrl,
    role: response.role,
    active: response.active,
    createdAt: response.createdAt,
  };
}
