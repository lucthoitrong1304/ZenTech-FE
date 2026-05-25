import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import {
  ApiResponseDto,
  EmployeeSummaryResponseDto,
  ManagementEmployee,
  ManagementEmployeeCreateRequest,
  ManagementEmployeePage,
  ManagementEmployeeQuery,
  PageResponseDto,
} from '../models/management-employee.models';

@Injectable({
  providedIn: 'root',
})
export class ManagementEmployeeService {
  private readonly apiService = inject(ApiService);
  private readonly employeesBaseUrl = `${environment.apiBaseUrl}/management/employees`;

  getEmployees(query: ManagementEmployeeQuery): Observable<ManagementEmployeePage> {
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
      .pipe(map(response => toManagementEmployeePage(unwrapApiResponse(response))));
  }

  createEmployee(payload: ManagementEmployeeCreateRequest): Observable<ManagementEmployee> {
    return this.apiService
      .post<ManagementEmployeeCreateRequest, ApiResponseDto<EmployeeSummaryResponseDto>>(
        this.employeesBaseUrl,
        payload
      )
      .pipe(map(response => toManagementEmployee(unwrapApiResponse(response))));
  }
}

function unwrapApiResponse<T>(response: ApiResponseDto<T>): T {
  if (!response.success) {
    throw new Error(response.message ?? 'Khong the xu ly yeu cau.');
  }

  return response.data;
}

function toManagementEmployeePage(response: PageResponseDto<EmployeeSummaryResponseDto>): ManagementEmployeePage {
  return {
    employees: response.content.map(toManagementEmployee),
    page: response.page,
    size: response.size,
    totalElements: response.totalElements,
    totalPages: response.totalPages,
    last: response.last,
  };
}

function toManagementEmployee(response: EmployeeSummaryResponseDto): ManagementEmployee {
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
