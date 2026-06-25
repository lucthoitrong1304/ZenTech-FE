import { Injectable, inject } from '@angular/core';
import { HttpContext, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { SKIP_AUTH_TOKEN, SKIP_GLOBAL_ERROR } from '../../../../../core/tokens/api-context.token';
import { environment } from '../../../../../../environments/environment';
import {
  ApiResponseDto,
  ManagementProduct,
  ManagementProductCategory,
  ManagementProductGroup,
  ManagementProductGroupDraft,
  ManagementProductGroupPage,
  ManagementProductGroupQuery,
  ManagementProductOption,
  ManagementProductPage,
  ManagementProductQuery,
  ManagementProductStats,
  ManagementProductStockStatus,
  PageResponseDto,
  ProductCategorySummaryResponseDto,
  ProductGroupResponseDto,
  ProductManagementSummaryResponseDto,
  ProductCreateRequest,
  ProductUpdateRequest,
  ProductManagementDetailResponse,
} from '../models/management-product.models';

export interface UploadPresignResponseDto {
  presignedUrl: string;
  fileKey: string;
  method: string;
  expiresInMinutes: number;
  requiredHeaders: Record<string, string>;
}

@Injectable({
  providedIn: 'root',
})
export class ManagementProductService {
  private readonly apiService = inject(ApiService);
  private readonly baseUrl = environment.apiBaseUrl;

  getCategories(): Observable<ManagementProductCategory[]> {
    return this.apiService
      .get<ProductCategorySummaryResponseDto[]>(`${this.baseUrl}/categories`)
      .pipe(map(tree => flattenCategories(tree)));
  }

  getProducts(query: ManagementProductQuery): Observable<ManagementProductPage> {
    const params: Record<string, string | number | boolean> = {
      page: query.page,
      size: query.size,
      sort: query.sort === 'name,asc' ? 'productName,asc' : 'createdAt,desc',
    };
    const keyword = query.keyword.trim();

    if (keyword) {
      params['keyword'] = keyword;
    }

    return this.apiService
      .get<ApiResponseDto<PageResponseDto<ProductManagementSummaryResponseDto>>>(
        `${this.baseUrl}/management/products`,
        { params }
      )
      .pipe(
        map(response => {
          const data = unwrapApiResponse(response);
          let products = data.content.map(p => this.toManagementProduct(p));

          if (query.categoryId !== 'all') {
            products = products.filter(p => p.categoryId === query.categoryId);
          }

          if (query.stockStatus !== 'all') {
            products = products.filter(p => p.status === query.stockStatus);
          }

          return {
            products,
            page: data.page,
            size: data.size,
            totalElements: data.totalElements,
            totalPages: data.totalPages,
            last: data.last,
          };
        })
      );
  }

  getProductStats(): Observable<ManagementProductStats> {
    const params = { page: 0, size: 100 };
    return this.apiService
      .get<ApiResponseDto<PageResponseDto<ProductManagementSummaryResponseDto>>>(
        `${this.baseUrl}/management/products`,
        { params }
      )
      .pipe(
        map(response => {
          const data = unwrapApiResponse(response);
          const products = data.content;

          const totalProducts = products.length;
          const outOfStock = products.filter(p => p.stock === 0).length;
          const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10).length;
          const inventoryValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

          return {
            totalProducts,
            outOfStock,
            inventoryValue,
            lowStock,
          };
        })
      );
  }

  deleteProduct(productId: string): Observable<string> {
    return this.apiService
      .delete<ApiResponseDto<ProductManagementSummaryResponseDto>>(
        `${this.baseUrl}/management/products/${productId}`
      )
      .pipe(map(() => productId));
  }

  getProductDetail(productId: string): Observable<ProductManagementDetailResponse> {
    return this.apiService
      .get<ApiResponseDto<ProductManagementDetailResponse>>(
        `${this.baseUrl}/management/products/${productId}`
      )
      .pipe(map(unwrapApiResponse));
  }

  createProduct(request: ProductCreateRequest): Observable<ProductManagementDetailResponse> {
    return this.apiService
      .post<ProductCreateRequest, ApiResponseDto<ProductManagementDetailResponse>>(
        `${this.baseUrl}/management/products`,
        request
      )
      .pipe(map(unwrapApiResponse));
  }

  updateProduct(productId: string, request: ProductUpdateRequest): Observable<ProductManagementDetailResponse> {
    return this.apiService
      .patch<ProductUpdateRequest, ApiResponseDto<ProductManagementDetailResponse>>(
        `${this.baseUrl}/management/products/${productId}`,
        request
      )
      .pipe(map(unwrapApiResponse));
  }

  requestProductImageUploadPresign(file: File): Observable<UploadPresignResponseDto> {
    return this.apiService.post<unknown, UploadPresignResponseDto>(`${this.baseUrl}/uploads/presign`, {
      originalFilename: file.name,
      contentType: file.type,
      fileSize: file.size,
      purpose: 'PRODUCT_IMAGE',
    });
  }

  uploadProductImage(presign: UploadPresignResponseDto, file: File): Observable<string> {
    return this.apiService.putFile(presign.presignedUrl, file, {
      headers: new HttpHeaders(presign.requiredHeaders),
      context: new HttpContext().set(SKIP_AUTH_TOKEN, true).set(SKIP_GLOBAL_ERROR, true),
    });
  }

  getProductGroups(query: ManagementProductGroupQuery): Observable<ManagementProductGroupPage> {
    const params: Record<string, string | number | boolean> = {
      page: query.page,
      size: query.size,
      sort: query.sort === 'name,asc' ? 'groupName,asc' : 'groupName,desc',
    };
    const keyword = query.keyword.trim();

    if (keyword) {
      params['keyword'] = keyword;
    }

    return this.apiService
      .get<ApiResponseDto<PageResponseDto<ProductGroupResponseDto>>>(
        `${this.baseUrl}/management/product-groups`,
        { params }
      )
      .pipe(
        map(response => {
          const data = unwrapApiResponse(response);
          let groups = data.content.map(g => this.toManagementProductGroup(g));

          if (query.activeFilter !== 'all') {
            const active = query.activeFilter === 'active';
            groups = groups.filter(g => g.active === active);
          }

          return {
            groups,
            page: data.page,
            size: data.size,
            totalElements: data.totalElements,
            totalPages: data.totalPages,
            last: data.last,
          };
        })
      );
  }

  getProductOptions(): Observable<ManagementProductOption[]> {
    const params = { page: 0, size: 100 };
    return this.apiService
      .get<ApiResponseDto<PageResponseDto<ProductManagementSummaryResponseDto>>>(
        `${this.baseUrl}/management/products`,
        { params }
      )
      .pipe(
        map(response => {
          const data = unwrapApiResponse(response);
          return data.content.map(p => {
            const firstCategory = p.categories && p.categories.length > 0 ? p.categories[0] : null;
            return {
              productId: p.id,
              name: p.productName,
              sku: `ZT-${p.id.substring(0, 8).toUpperCase()}`,
              categoryName: firstCategory ? firstCategory.categoryName : 'Chưa phân loại',
            };
          });
        })
      );
  }

  createProductGroup(draft: ManagementProductGroupDraft): Observable<ManagementProductGroup> {
    const body = {
      groupName: draft.name,
      description: '',
      productIds: draft.productIds,
    };
    return this.apiService
      .post<unknown, ApiResponseDto<ProductGroupResponseDto>>(
        `${this.baseUrl}/management/product-groups`,
        body
      )
      .pipe(map(response => this.toManagementProductGroup(unwrapApiResponse(response))));
  }

  updateProductGroup(draft: ManagementProductGroupDraft): Observable<ManagementProductGroup> {
    const body = {
      groupName: draft.name,
      description: '',
      productIds: draft.productIds,
    };
    return this.apiService
      .patch<unknown, ApiResponseDto<ProductGroupResponseDto>>(
        `${this.baseUrl}/management/product-groups/${draft.groupId}`,
        body
      )
      .pipe(map(response => this.toManagementProductGroup(unwrapApiResponse(response))));
  }

  deleteProductGroup(groupId: string): Observable<string> {
    return this.apiService
      .delete<ApiResponseDto<ProductGroupResponseDto>>(
        `${this.baseUrl}/management/product-groups/${groupId}`
      )
      .pipe(map(() => groupId));
  }

  private toManagementProduct(p: ProductManagementSummaryResponseDto): ManagementProduct {
    const firstCategory = p.categories && p.categories.length > 0 ? p.categories[0] : null;
    const stockVal = p.stock ?? 0;
    const priceVal = p.price ?? 0;
    let statusVal: ManagementProductStockStatus = 'OUT_OF_STOCK';

    if (p.status) {
      statusVal = p.status as ManagementProductStockStatus;
    } else {
      if (stockVal > 10) {
        statusVal = 'IN_STOCK';
      } else if (stockVal > 0) {
        statusVal = 'LOW_STOCK';
      }
    }

    return {
      productId: p.id,
      name: p.productName,
      sku: `ZT-${p.id.substring(0, 8).toUpperCase()}`,
      categoryId: firstCategory ? firstCategory.id : '',
      categoryName: firstCategory ? firstCategory.categoryName : 'Chưa phân loại',
      price: priceVal,
      stock: stockVal,
      imageUrl: p.representativeImageUrl,
      status: statusVal,
    };
  }

  private toManagementProductGroup(g: ProductGroupResponseDto): ManagementProductGroup {
    return {
      groupId: g.id,
      name: g.groupName,
      iconName: 'package',
      productIds: g.productIds ? g.productIds.map(id => id.toString()) : [],
      productCount: g.productCount,
      active: !g.deleted,
    };
  }
}

function unwrapApiResponse<T>(response: ApiResponseDto<T>): T {
  if (!response.success) {
    throw new Error(response.message ?? 'Không thể xử lý yêu cầu.');
  }

  return response.data;
}

function flattenCategories(tree: ProductCategorySummaryResponseDto[]): ManagementProductCategory[] {
  const result: ManagementProductCategory[] = [];

  function traverse(nodes: ProductCategorySummaryResponseDto[]) {
    for (const node of nodes) {
      result.push({
        categoryId: node.id,
        name: node.categoryName,
      });
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(tree);
  return result;
}
