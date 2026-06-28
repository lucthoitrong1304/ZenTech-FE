import { PermissionCode } from '../../../../core/permissions/permission.models';

export interface CommandPaletteItem {
  id: string;
  icon: string;
  label: string;
  description?: string;
  path?: string;
  action?: () => void;
  permission?: PermissionCode;
}

export interface CommandPaletteGroup {
  id: string;
  title: string;
  items: CommandPaletteItem[];
}

export interface GlobalSearchItemResponse {
  id: string;
  icon: string;
  label: string;
  description: string;
  path: string;
}

export interface GlobalSearchResponse {
  products: GlobalSearchItemResponse[];
  orders: GlobalSearchItemResponse[];
  customers: GlobalSearchItemResponse[];
}

export interface ApiResponseDto<T> {
  success: boolean;
  data: T;
  message?: string;
}
