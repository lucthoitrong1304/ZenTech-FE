export type ManagementEmployeeRole = 'MANAGER' | 'EMPLOYEE';

export interface ManagementEmployee {
  employeeId: string;
  accountId: string;
  email: string;
  fullName: string;
  imageUrl: string | null;
  role: ManagementEmployeeRole;
  active: boolean;
  createdAt: string | null;
}

export interface ManagementEmployeeQuery {
  page: number;
  size: number;
  sort: ManagementEmployeeSort;
  keyword: string;
  active: boolean | null;
  role: ManagementEmployeeRole | null;
}

export type ManagementEmployeeSort = 'createdAt,desc' | 'createdAt,asc' | 'fullName,asc' | 'email,asc' | 'role,asc';

export interface ManagementEmployeeCreateDraft {
  fullName: string;
  email: string;
  role: ManagementEmployeeRole | '';
}

export interface ManagementEmployeeUpdateDraft {
  fullName: string;
  email: string;
  role: ManagementEmployeeRole | '';
  active: boolean;
}

export interface ManagementEmployeeCreateRequest {
  fullName: string;
  email: string;
  role: ManagementEmployeeRole;
}

export interface ManagementEmployeeUpdateRequest {
  fullName: string;
  email: string;
  role: ManagementEmployeeRole;
  active: boolean;
}

export interface ManagementEmployeePage {
  employees: ManagementEmployee[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ManagementEmployeeFormErrors {
  fullName?: string;
  email?: string;
  role?: string;
  submit?: string;
}

export interface ApiResponseDto<T> {
  success: boolean;
  data: T;
  message: string | null;
}

export interface PageResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface EmployeeSummaryResponseDto {
  employeeId: string;
  accountId: string;
  email: string;
  fullName: string;
  imageUrl: string | null;
  role: ManagementEmployeeRole;
  active: boolean;
  createdAt: string | null;
}

