export interface ManagementCategory {
  id: string;
  categoryName: string;
  shortName: string | null;
  visible: boolean;
  hasChildren: boolean;
  parentId: string | null;
  depth: number;
  children: ManagementCategory[];
}

export interface ManagementCategoryDraft {
  id?: string;
  categoryName: string;
  shortName: string;
  parentId: string | null;
  visible: boolean;
}

export interface ManagementCategoryFormErrors {
  categoryName?: string;
  shortName?: string;
  parentId?: string;
  submit?: string;
}

export type ManagementCategoryDialogMode = 'create' | 'edit' | null;
export type ManagementCategoryVisibilityFilter = 'all' | 'visible' | 'hidden';

export interface ManagementCategoryQuery {
  keyword: string;
  visibility: ManagementCategoryVisibilityFilter;
}

export interface CategoryManagementRequestDto {
  categoryName: string;
  shortName: string | null;
  parentId: string | null;
  visible: boolean;
}

export interface CategoryReorderRequestDto {
  items: CategoryReorderItemRequestDto[];
}

export interface CategoryReorderItemRequestDto {
  id: string;
  parentId: string | null;
  priority: number;
}

export interface ProductCategorySummaryResponseDto {
  id: string;
  categoryName: string;
  shortName: string | null;
  visible: boolean;
  hasChildren: boolean;
  children: ProductCategorySummaryResponseDto[] | null;
}

export interface ApiResponseDto<T> {
  success: boolean;
  message: string | null;
  data: T;
}
