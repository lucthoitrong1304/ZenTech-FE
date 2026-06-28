import { HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiService } from '../../../../core/api/api.service';
import { SKIP_AUTH_TOKEN } from '../../../../core/tokens/api-context.token';
import { environment } from '../../../../../environments/environment';
import {
  ProductCategory,
  ProductCategoryListing,
  ProductCategoryListingQuery,
  ProductDetail,
  ProductGroupItem,
  ProductListItem,
  ProductReview,
  ProductReviewPayload,
  ProductSpec,
  ProductVariant,
} from '../models/product-catalog.models';

export const PRODUCT_CATEGORY_NOT_FOUND = 'PRODUCT_CATEGORY_NOT_FOUND';
export const PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND';

@Injectable({
  providedIn: 'root',
})
export class ProductCatalogService {
  private readonly apiService = inject(ApiService);
  private readonly categoriesBaseUrl = `${environment.apiBaseUrl}/categories`;
  private readonly productsBaseUrl = `${environment.apiBaseUrl}/products`;

  getCategoryTree(): Observable<ProductCategory[]> {
    return this.apiService
      .get<ProductCategoryTreeItemResponseDto[]>(this.categoriesBaseUrl, publicCatalogOptions())
      .pipe(map(categories => categories.map(toProductCategory)));
  }

  getCategoryListing(
    category: ProductCategory,
    query: ProductCategoryListingQuery = { page: 0, size: 10, sort: 'NEWEST' }
  ): Observable<ProductCategoryListing> {
    if (!category.id) {
      return throwError(() => new Error(PRODUCT_CATEGORY_NOT_FOUND));
    }

    const params: Record<string, string | number | boolean> = {
      page: query.page,
      size: query.size,
      sort: query.sort,
    };
    if (query.minRating) {
      params['minRating'] = query.minRating;
    }

    return this.apiService
      .get<PagedResponse<CategoryProductListItemResponseDto>>(
        `${this.categoriesBaseUrl}/${category.id}/products`,
        {
          params,
          context: publicCatalogContext(),
        }
      )
      .pipe(
        map(response =>
          toCategoryListing(
            {
              id: category.id,
              slug: category.slug,
              label: category.label,
            },
            response
          )
        )
      );
  }

  getProducts(query: {
    search?: string;
    sort?: string;
    page?: number;
    size?: number;
    minRating?: number | null;
  }): Observable<PagedResponse<ProductListItem>> {
    const trimmedSearch = query.search?.trim() ?? '';
    const params: Record<string, string | number | boolean> = {
      search: trimmedSearch,
      sort: query.sort ?? 'NEWEST',
      page: query.page ?? 0,
      size: query.size ?? 10,
    };
    if (query.minRating) {
      params['minRating'] = query.minRating;
    }

    return this.apiService
      .get<PagedResponse<CategoryProductListItemResponseDto>>(this.productsBaseUrl, {
        params,
        context: publicCatalogContext(),
      })
      .pipe(
        map(response => ({
          ...response,
          items: response.items.map(item => toProductListItem('', item)),
        }))
      );
  }

  getProductDetail(productId: string): Observable<ProductDetail> {
    return this.apiService
      .get<ProductDetailResponseDto>(`${this.productsBaseUrl}/${productId}`, publicCatalogOptions())
      .pipe(
        map(toProductDetail),
        catchError(error =>
          isNotFoundResponse(error)
            ? throwError(() => new Error(PRODUCT_NOT_FOUND))
            : throwError(() => error)
        )
      );
  }

  getProductReviews(
    productId: string,
    query: ProductReviewListQuery = { page: 0, size: 5 }
  ): Observable<ProductReview[]> {
    return this.apiService
      .get<PagedResponse<ProductReviewItemResponseDto>>(
        `${this.productsBaseUrl}/${productId}/reviews`,
        {
          params: {
            page: query.page,
            size: query.size,
          },
        }
      )
      .pipe(map(response => response.items.map(toProductReview)));
  }

  addProductReview(productId: string, payload: ProductReviewPayload): Observable<ProductReview> {
    return this.apiService
      .post<ProductReviewRequestDto, ProductReviewItemResponseDto>(
        `${this.productsBaseUrl}/${productId}/reviews`,
        {
          rating: payload.rating,
          comment: payload.comment.trim(),
          imageKeys: payload.imageKeys ?? [],
          videoKey: payload.videoKey,
        }
      )
      .pipe(map(toProductReview));
  }

  updateProductReview(
    productId: string,
    reviewId: string,
    payload: ProductReviewPayload
  ): Observable<ProductReview> {
    const body: ProductReviewRequestDto = {
      rating: payload.rating,
      comment: payload.comment.trim(),
    };
    if (payload.imageKeys !== undefined) {
      body.imageKeys = payload.imageKeys;
    }
    if (payload.videoKey !== undefined) {
      body.videoKey = payload.videoKey;
    }

    return this.apiService
      .put<ProductReviewRequestDto, ProductReviewItemResponseDto>(
        `${this.productsBaseUrl}/${productId}/reviews/${reviewId}`,
        body
      )
      .pipe(map(toProductReview));
  }
}

interface ProductCategoryTreeItemResponseDto {
  id: string;
  categoryName: string;
  shortName: string | null;
  hasChildren: boolean;
  children: ProductCategoryTreeItemResponseDto[] | null;
}

interface CategoryProductListItemResponseDto {
  id: string;
  productName: string;
  imageUrl: string | null;
  originalPrice: number | null;
  salePrice: number | null;
  averageRating: number | null;
  stockQuantity: number | null;
}

interface ProductDetailResponseDto {
  id: string;
  productName: string;
  specifications: string | null;
  compatibility: string | null;
  boxContents: string | null;
  supportInfo: string | null;
  createdAt: string | null;
  productImageUrls: string[] | null;
  groupProducts: ProductGroupItemResponseDto[] | null;
  similarProducts: CategoryProductListItemResponseDto[] | null;
  variants: ProductVariantDetailResponseDto[] | null;
  averageRating: number | null;
  totalReviews: number;
}

interface ProductVariantDetailResponseDto {
  id: string;
  originalPrice: number;
  salePrice: number | null;
  name: string | null;
  nameColor: string | null;
  colorCode: string | null;
  saleStartAt: string | null;
  saleEndAt: string | null;
  stockQuantity: number;
}

interface ProductGroupItemResponseDto {
  id: string;
  productName: string;
  imageUrl: string | null;
}

interface ProductReviewItemResponseDto {
  reviewId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string | null;
  customerId: string;
  customerName: string | null;
  isOwner: boolean;
  imageKeys: string[] | null;
  videoKey: string | null;
  imageUrls: string[] | null;
  videoUrl: string | null;
}

interface ProductReviewRequestDto {
  rating: number;
  comment: string;
  imageKeys?: string[];
  videoKey?: string | null;
}

interface ProductReviewListQuery {
  page: number;
  size: number;
}

interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

const PRODUCT_IMAGE_PLACEHOLDER = '/home/asset-1.webp';

function toProductCategory(category: ProductCategoryTreeItemResponseDto): ProductCategory {
  const label = category.shortName || category.categoryName;
  return {
    id: category.id,
    slug: normalizeCategorySlug(label),
    label,
    children: category.children?.map(toProductCategory) ?? [],
  };
}

function toCategoryListing(
  category: ProductCategory,
  response: PagedResponse<CategoryProductListItemResponseDto>
): ProductCategoryListing {
  return {
    category,
    products: response.items.map(product => toProductListItem(category.slug, product)),
    page: response.page,
    size: response.size,
    totalItems: response.totalItems,
    totalPages: response.totalPages,
    hasNext: response.hasNext,
    hasPrevious: response.hasPrevious,
  };
}

function toProductDetail(response: ProductDetailResponseDto): ProductDetail {
  const variants = response.variants?.map(toProductVariant) ?? [];
  const selectedVariant = variants[0] ?? null;
  const image = response.productImageUrls?.find(url => !!url?.trim()) || PRODUCT_IMAGE_PLACEHOLDER;
  const gallery = uniqueStrings([...(response.productImageUrls ?? []), image]);
  const price = selectedVariant ? getEffectivePrice(selectedVariant) : 0;
  const originalPrice = selectedVariant?.salePrice ? selectedVariant.originalPrice : undefined;
  const reviewCount = response.totalReviews;
  const rating = response.averageRating ?? undefined;

  return {
    id: response.id,
    categorySlug: '',
    slug: response.id,
    name: response.productName,
    image,
    price,
    originalPrice,
    rating,
    reviewCount,
    inStock: (selectedVariant?.stockQuantity ?? 0) > 0,
    gallery,
    highlights: buildHighlights(response, variants),
    specs: toProductSpecs(response),
    maxQuantity: selectedVariant?.stockQuantity ?? 0,
    reviews: [],
    relatedProductSlugs: [],
    relatedProducts: response.similarProducts?.map(product => toProductListItem('', product)) ?? [],
    groupProducts: response.groupProducts?.map(toProductGroupItem) ?? [],
    variants,
    compatibility: response.compatibility ?? undefined,
    boxContents: response.boxContents ?? undefined,
    supportInfo: response.supportInfo ?? undefined,
  };
}

function toProductVariant(variant: ProductVariantDetailResponseDto): ProductVariant {
  return {
    id: variant.id,
    name: variant.name?.trim() || 'Default',
    nameColor: variant.nameColor?.trim() || undefined,
    colorCode: variant.colorCode?.trim() || undefined,
    originalPrice: variant.originalPrice,
    salePrice: variant.salePrice ?? undefined,
    stockQuantity: variant.stockQuantity,
  };
}

function toProductListItem(
  categorySlug: string,
  product: CategoryProductListItemResponseDto
): ProductListItem {
  const salePrice = product.salePrice ?? undefined;
  const originalPrice = product.originalPrice ?? undefined;
  const price = salePrice ?? originalPrice ?? 0;

  return {
    id: product.id,
    categorySlug,
    slug: product.id,
    name: product.productName,
    image: product.imageUrl?.trim() || PRODUCT_IMAGE_PLACEHOLDER,
    price,
    originalPrice:
      originalPrice !== undefined && salePrice !== undefined && originalPrice !== salePrice
        ? originalPrice
        : undefined,
    rating: product.averageRating ?? undefined,
    inStock: (product.stockQuantity ?? 0) > 0,
  };
}

function toProductGroupItem(product: ProductGroupItemResponseDto): ProductGroupItem {
  return {
    id: product.id,
    name: product.productName,
    image: product.imageUrl?.trim() || PRODUCT_IMAGE_PLACEHOLDER,
  };
}

function toProductReview(review: ProductReviewItemResponseDto): ProductReview {
  return {
    id: review.reviewId,
    reviewerName: review.customerName?.trim() || 'ZenTech Customer',
    rating: review.rating,
    title: 'Customer review',
    comment: review.comment?.trim() || '',
    createdAt: review.createdAt,
    isOwner: review.isOwner,
    imageKeys: uniqueStrings(review.imageKeys ?? []),
    videoKey: review.videoKey?.trim() || undefined,
    imageUrls: uniqueStrings(review.imageUrls ?? []),
    videoUrl: review.videoUrl?.trim() || undefined,
  };
}

function toProductSpecs(response: ProductDetailResponseDto): ProductSpec[] {
  return [
    { label: 'Specifications', value: response.specifications },
    { label: 'Compatibility', value: response.compatibility },
    { label: 'Box contents', value: response.boxContents },
    { label: 'Support', value: response.supportInfo },
  ].flatMap(spec =>
    spec.value?.trim()
      ? [
          {
            label: spec.label,
            value: spec.value.trim(),
          },
        ]
      : []
  );
}

function buildHighlights(
  response: ProductDetailResponseDto,
  variants: ProductVariant[]
): string[] {
  const totalStock = variants.reduce((total, variant) => total + variant.stockQuantity, 0);

  return [
    variants.length > 0 ? `${variants.length} variant${variants.length > 1 ? 's' : ''}` : '',
    totalStock > 0 ? `${totalStock} units available` : 'Back soon',
    response.totalReviews > 0 ? `${response.totalReviews} customer reviews` : '',
    response.averageRating ? `${response.averageRating.toFixed(1)} average rating` : '',
  ].filter(Boolean);
}

function getEffectivePrice(variant: ProductVariant): number {
  return variant.salePrice ?? variant.originalPrice;
}

function uniqueStrings(values: string[]): string[] {
  const normalized = values.map(value => value.trim()).filter(Boolean);
  return [...new Set(normalized)];
}

function normalizeCategorySlug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function isNotFoundResponse(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 404;
}

function publicCatalogOptions(): { context: HttpContext } {
  return { context: publicCatalogContext() };
}

function publicCatalogContext(): HttpContext {
  return new HttpContext().set(SKIP_AUTH_TOKEN, true);
}
