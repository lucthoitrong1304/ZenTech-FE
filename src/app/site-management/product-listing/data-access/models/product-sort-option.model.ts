export type ProductSortOptionValue = 'featured' | 'price-asc' | 'price-desc';

export interface ProductSortOption {
  value: ProductSortOptionValue;
  label: string;
}

export const PRODUCT_SORT_OPTIONS: ProductSortOption[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];
