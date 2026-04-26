import { ProductCategory } from './product-category.model';
import { ProductListItem } from './product-list-item.model';
import { ProductSortOptionValue } from './product-sort-option.model';

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
