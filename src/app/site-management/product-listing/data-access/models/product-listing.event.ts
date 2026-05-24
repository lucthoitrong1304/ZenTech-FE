import { ProductCategoryListing } from '../../../product-catalog/data-access/models/product-catalog.models';
import { ProductSortOptionValue } from './product-sort-option.model';

export enum ProductListingEventType {
  CategoryLoadStarted = 'Category Load Started',
  CategoryLoadSucceeded = 'Category Load Succeeded',
  CategoryLoadFailed = 'Category Load Failed',
  MoreProductsLoadStarted = 'More Products Load Started',
  MoreProductsLoadSucceeded = 'More Products Load Succeeded',
  MoreProductsLoadFailed = 'More Products Load Failed',
  SortChanged = 'Sort Changed',
  ProductAddToCartStarted = 'Product Add To Cart Started',
  ProductAddToCartSucceeded = 'Product Add To Cart Succeeded',
  ProductAddToCartFailed = 'Product Add To Cart Failed',
  CartMessageCleared = 'Cart Message Cleared',
}

export type ProductListingEvent =
  | { type: ProductListingEventType.CategoryLoadStarted; slug: string }
  | {
      type: ProductListingEventType.CategoryLoadSucceeded;
      listing: ProductCategoryListing;
    }
  | { type: ProductListingEventType.CategoryLoadFailed; isInvalidCategory: boolean }
  | { type: ProductListingEventType.MoreProductsLoadStarted }
  | {
      type: ProductListingEventType.MoreProductsLoadSucceeded;
      listing: ProductCategoryListing;
    }
  | { type: ProductListingEventType.MoreProductsLoadFailed }
  | { type: ProductListingEventType.SortChanged; sortBy: ProductSortOptionValue }
  | { type: ProductListingEventType.ProductAddToCartStarted; productId: string }
  | { type: ProductListingEventType.ProductAddToCartSucceeded; productName: string }
  | { type: ProductListingEventType.ProductAddToCartFailed; error: string }
  | { type: ProductListingEventType.CartMessageCleared };
