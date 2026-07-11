import { ProductCategory } from '@/site-management/customer/catalog/listing/data-access/models/product-category.model';
import { ProductListItem } from '@/site-management/customer/catalog/listing/data-access/models/product-list-item.model';
import { ProductSortOptionValue } from '@/site-management/customer/catalog/listing/data-access/models/product-sort-option.model';

export interface ProductListingViewModel {
  category: ProductCategory | null;
  products: ProductListItem[];
  sortedProducts: ProductListItem[];
  sortBy: ProductSortOptionValue;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  isInvalidCategory: boolean;
}
