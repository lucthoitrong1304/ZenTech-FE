export enum PermissionCode {
  ORDER_VIEW = 'ORDER_VIEW',
  ORDER_CREATE = 'ORDER_CREATE',
  ORDER_UPDATE = 'ORDER_UPDATE',
  ORDER_DELETE = 'ORDER_DELETE',
  RETURN_VIEW = 'RETURN_VIEW',
  RETURN_APPROVE = 'RETURN_APPROVE',
  PRODUCT_VIEW = 'PRODUCT_VIEW',
  PRODUCT_CREATE = 'PRODUCT_CREATE',
  PRODUCT_UPDATE = 'PRODUCT_UPDATE',
  PRODUCT_DELETE = 'PRODUCT_DELETE',
  INVENTORY_VIEW = 'INVENTORY_VIEW',
  INVENTORY_UPDATE = 'INVENTORY_UPDATE',
  CUSTOMER_VIEW = 'CUSTOMER_VIEW',
  CUSTOMER_UPDATE = 'CUSTOMER_UPDATE',
  EMPLOYEE_VIEW = 'EMPLOYEE_VIEW',
  EMPLOYEE_CREATE = 'EMPLOYEE_CREATE',
  EMPLOYEE_UPDATE = 'EMPLOYEE_UPDATE',
  SCHEDULE_VIEW = 'SCHEDULE_VIEW',
  SCHEDULE_UPDATE = 'SCHEDULE_UPDATE',
  APPROVAL_VIEW = 'APPROVAL_VIEW',
  APPROVAL_APPROVE = 'APPROVAL_APPROVE',
  MARKETING_VIEW = 'MARKETING_VIEW',
  MARKETING_CREATE = 'MARKETING_CREATE',
  MARKETING_UPDATE = 'MARKETING_UPDATE',
  MARKETING_DELETE = 'MARKETING_DELETE',
  REPORT_VIEW = 'REPORT_VIEW',
  REPORT_ANALYZE = 'REPORT_ANALYZE',
  CHAT_VIEW = 'CHAT_VIEW',
  CHAT_UPDATE = 'CHAT_UPDATE',
  AI_VIEW = 'AI_VIEW',
  AI_CREATE = 'AI_CREATE',
  AI_UPDATE = 'AI_UPDATE',
  AI_DELETE = 'AI_DELETE',
  PAY_PERIOD_VIEW = 'PAY_PERIOD_VIEW',
  PAY_PERIOD_UPDATE = 'PAY_PERIOD_UPDATE',
}

export type ConfigurableRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE';
export type PermissionRole = 'ADMIN' | ConfigurableRole;

export interface PermissionItem {
  code: PermissionCode;
  action: string;
  description: string;
}

export interface PermissionModule {
  module: string;
  moduleName: string;
  permissions: PermissionItem[];
}

export interface PermissionMatrix {
  configurableRoles: ConfigurableRole[];
  modules: PermissionModule[];
  rolePermissions: Record<PermissionRole, PermissionCode[]>;
}

export interface CurrentPermissions {
  role: string;
  permissions: PermissionCode[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
