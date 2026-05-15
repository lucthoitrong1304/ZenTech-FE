export type OwnerEmployeeRole = 'MANAGER' | 'EMPLOYEE';

export interface OwnerEmployee {
  employeeId: string;
  accountId: string;
  email: string;
  fullName: string;
  imageUrl: string | null;
  role: OwnerEmployeeRole;
  active: boolean;
  createdAt: string | null;
}

export interface OwnerEmployeeQuery {
  page: number;
  size: number;
  sort: OwnerEmployeeSort;
  keyword: string;
  active: boolean | null;
  role: OwnerEmployeeRole | null;
}

export type OwnerEmployeeSort = 'createdAt,desc' | 'createdAt,asc' | 'fullName,asc' | 'email,asc' | 'role,asc';

export interface OwnerEmployeeCreateDraft {
  fullName: string;
  email: string;
  role: OwnerEmployeeRole | '';
}

export interface OwnerEmployeeCreateRequest {
  fullName: string;
  email: string;
  role: OwnerEmployeeRole;
}

export interface OwnerEmployeePage {
  employees: OwnerEmployee[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface OwnerEmployeeFormErrors {
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
  role: OwnerEmployeeRole;
  active: boolean;
  createdAt: string | null;
}

