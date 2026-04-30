export interface ProductCategory {
  id?: string;
  slug: string;
  label: string;
  subtitle?: string;
  description?: string;
  heroImage?: string;
  heroEyebrow?: string;
  children?: ProductCategory[];
}

export interface ProductListItem {
  id: string;
  categorySlug: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  badgeTone?: 'red' | 'purple' | 'amber';
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  nameColor?: string;
  colorCode?: string;
  originalPrice: number;
  salePrice?: number;
  stockQuantity: number;
}

export interface ProductGroupItem {
  id: string;
  name: string;
  image: string;
}

export interface ProductCategoryListing {
  category: ProductCategory;
  products: ProductListItem[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ProductCategoryListingQuery {
  page: number;
  size: number;
  sort: ProductCategoryListingSort;
}

export type ProductCategoryListingSort = 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC';

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductReview {
  id: string;
  reviewerName: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  imageUrls: string[];
}

export interface ProductReviewPayload {
  reviewerName?: string;
  rating: number;
  title?: string;
  comment: string;
  imageKeys?: string[];
}

export interface ProductDetail extends ProductListItem {
  category?: ProductCategory;
  gallery: string[];
  description: string;
  highlights: string[];
  specs: ProductSpec[];
  maxQuantity: number;
  reviews: ProductReview[];
  relatedProductSlugs: string[];
  relatedProducts?: ProductListItem[];
  groupProducts?: ProductGroupItem[];
  variants: ProductVariant[];
  compatibility?: string;
  boxContents?: string;
  supportInfo?: string;
}
