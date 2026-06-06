export enum AdminAccountRole {
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  CUSTOMER = 'CUSTOMER',
}

export enum AccountActiveFilter {
  All = 'ALL',
  Active = 'ACTIVE',
  Locked = 'LOCKED',
}

export enum AccountDialogMode {
  None = 'NONE',
  Create = 'CREATE',
  EditRole = 'EDIT_ROLE',
}

export enum AccountSortField {
  CreatedAt = 'createdAt',
  Email = 'email',
  Role = 'role',
}

export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc',
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface AccountSummary {
  id: string;
  email: string;
  role: AdminAccountRole;
  isActive: boolean;
  createdAt: string;
  displayName: string;
  imageUrl: string | null;
}

export interface AccountQuery {
  page: number;
  size: number;
  sortField: AccountSortField;
  sortDirection: SortDirection;
  keyword: string;
  role: AdminAccountRole | null;
  active: boolean | null;
}

export interface CreateInternalAccountPayload {
  email: string;
  password: string;
  fullName: string;
  role: AdminAccountRole;
}

export interface UpdateAccountRolePayload {
  role: AdminAccountRole;
}

export interface UpdateAccountStatusPayload {
  active: boolean;
}

export interface AccountRoleOption {
  label: string;
  value: AdminAccountRole | null;
}

export interface AccountStatusOption {
  label: string;
  value: AccountActiveFilter;
}
