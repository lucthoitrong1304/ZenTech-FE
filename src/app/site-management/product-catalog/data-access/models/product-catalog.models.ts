export interface ProductCategory {
  slug: string;
  label: string;
  subtitle: string;
  description: string;
  heroImage: string;
  heroEyebrow?: string;
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

export interface ProductCategoryListing {
  category: ProductCategory;
  products: ProductListItem[];
}

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
}

export interface ProductReviewPayload {
  reviewerName?: string;
  rating: number;
  title: string;
  comment: string;
}

export interface ProductDetail extends ProductListItem {
  category: ProductCategory;
  gallery: string[];
  description: string;
  highlights: string[];
  specs: ProductSpec[];
  maxQuantity: number;
  reviews: ProductReview[];
  relatedProductSlugs: string[];
}
