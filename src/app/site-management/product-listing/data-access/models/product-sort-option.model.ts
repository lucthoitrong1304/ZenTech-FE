export type ProductSortOptionValue =
  | 'featured'
  | 'oldest'
  | 'price-asc'
  | 'price-desc'
  | 'rating-desc'
  | 'rating-asc';

export interface ProductSortOption {
  value: ProductSortOptionValue;
  label: string;
}

export const PRODUCT_SORT_OPTIONS: ProductSortOption[] = [
  { value: 'featured', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'price-asc', label: 'Giá: Thấp đến Cao' },
  { value: 'price-desc', label: 'Giá: Cao đến Thấp' },
  { value: 'rating-desc', label: 'Đánh giá: Cao đến Thấp' },
  { value: 'rating-asc', label: 'Đánh giá: Thấp đến Cao' },
];
