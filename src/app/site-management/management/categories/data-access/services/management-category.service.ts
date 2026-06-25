import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { environment } from '../../../../../../environments/environment';
import {
  ApiResponseDto,
  CategoryManagementRequestDto,
  CategoryReorderRequestDto,
  ManagementCategory,
  ManagementCategoryDraft,
  ProductCategorySummaryResponseDto,
} from '../models/management-category.models';

@Injectable({
  providedIn: 'root',
})
export class ManagementCategoryService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/management/categories`;

  getCategories(): Observable<ManagementCategory[]> {
    return this.apiService
      .get<ApiResponseDto<ProductCategorySummaryResponseDto[]>>(this.baseUrl)
      .pipe(map(response => toManagementCategoryTree(unwrapApiResponse(response))));
  }

  createCategory(draft: ManagementCategoryDraft): Observable<ManagementCategory> {
    return this.apiService
      .post<CategoryManagementRequestDto, ApiResponseDto<ProductCategorySummaryResponseDto>>(
        this.baseUrl,
        toCategoryRequest(draft)
      )
      .pipe(map(response => toManagementCategory(unwrapApiResponse(response))));
  }

  updateCategory(draft: ManagementCategoryDraft): Observable<ManagementCategory> {
    if (!draft.id) {
      throw new Error('Category id is required for update.');
    }

    return this.apiService
      .patch<CategoryManagementRequestDto, ApiResponseDto<ProductCategorySummaryResponseDto>>(
        `${this.baseUrl}/${draft.id}`,
        toCategoryRequest(draft)
      )
      .pipe(map(response => toManagementCategory(unwrapApiResponse(response))));
  }

  deleteCategory(categoryId: string): Observable<string> {
    return this.apiService
      .delete<ApiResponseDto<ProductCategorySummaryResponseDto>>(`${this.baseUrl}/${categoryId}`)
      .pipe(map(response => unwrapApiResponse(response).id));
  }

  reorderCategories(items: CategoryReorderRequestDto['items']): Observable<ManagementCategory[]> {
    return this.apiService
      .patch<CategoryReorderRequestDto, ApiResponseDto<ProductCategorySummaryResponseDto[]>>(
        `${this.baseUrl}/tree`,
        { items }
      )
      .pipe(map(response => toManagementCategoryTree(unwrapApiResponse(response))));
  }
}

export function toManagementCategoryTree(
  categories: ProductCategorySummaryResponseDto[]
): ManagementCategory[] {
  return categories.map(category => toManagementCategory(category, null, 0));
}

export function toManagementCategory(
  category: ProductCategorySummaryResponseDto,
  parentId: string | null = null,
  depth = 0
): ManagementCategory {
  return {
    id: category.id,
    categoryName: category.categoryName,
    shortName: category.shortName,
    visible: category.visible,
    hasChildren: category.hasChildren,
    parentId,
    depth,
    children: (category.children ?? []).map(child => toManagementCategory(child, category.id, depth + 1)),
  };
}

export function flattenManagementCategories(categories: ManagementCategory[]): ManagementCategory[] {
  return categories.flatMap(category => [
    category,
    ...flattenManagementCategories(category.children),
  ]);
}

export function buildCategoryReorderItems(
  categories: ManagementCategory[]
): CategoryReorderRequestDto['items'] {
  const items: CategoryReorderRequestDto['items'] = [];

  function collect(nodes: ManagementCategory[], parentId: string | null): void {
    nodes.forEach((node, index) => {
      items.push({
        id: node.id,
        parentId,
        priority: index + 1,
      });
      collect(node.children, node.id);
    });
  }

  collect(categories, null);
  return items;
}

export function moveCategoryWithinSiblings(
  categories: ManagementCategory[],
  categoryId: string,
  direction: 'up' | 'down'
): ManagementCategory[] | null {
  const result = moveInNodes(categories, categoryId, direction);

  return result.moved ? result.nodes : null;
}

export function readManagementCategoryError(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const apiError = error.error;

    if (hasApiMessage(apiError) && apiError.message.trim()) {
      return apiError.message.trim();
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}

function moveInNodes(
  nodes: ManagementCategory[],
  categoryId: string,
  direction: 'up' | 'down'
): { nodes: ManagementCategory[]; moved: boolean } {
  const index = nodes.findIndex(node => node.id === categoryId);

  if (index >= 0) {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= nodes.length) {
      return { nodes, moved: false };
    }

    const nextNodes = [...nodes];
    const current = nextNodes[index];
    nextNodes[index] = nextNodes[targetIndex];
    nextNodes[targetIndex] = current;

    return { nodes: nextNodes, moved: true };
  }

  let moved = false;
  const nextNodes = nodes.map(node => {
    if (moved) {
      return node;
    }

    const childResult = moveInNodes(node.children, categoryId, direction);

    if (!childResult.moved) {
      return node;
    }

    moved = true;
    return {
      ...node,
      children: childResult.nodes,
    };
  });

  return { nodes: nextNodes, moved };
}

function toCategoryRequest(draft: ManagementCategoryDraft): CategoryManagementRequestDto {
  const shortName = draft.shortName.trim();

  return {
    categoryName: draft.categoryName.trim(),
    shortName: shortName || null,
    parentId: draft.parentId,
    visible: draft.visible,
  };
}

function unwrapApiResponse<T>(response: ApiResponseDto<T>): T {
  if (!response.success) {
    throw new Error(response.message ?? 'Không thể xử lý yêu cầu.');
  }

  return response.data;
}

function hasApiMessage(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  );
}
