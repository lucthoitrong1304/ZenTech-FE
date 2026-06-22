export type ProductSortOptionValue = 'featured' | 'price-asc' | 'price-desc';

export interface ProductSortOption {
  value: ProductSortOptionValue;
  label: string;
}

export const PRODUCT_SORT_OPTIONS: ProductSortOption[] = [
  { value: 'featured', label: 'Nổi bật' },
  { value: 'price-asc', label: 'Giá: Thấp đến Cao' },
  { value: 'price-desc', label: 'Giá: Cao đến Thấp' },
];
