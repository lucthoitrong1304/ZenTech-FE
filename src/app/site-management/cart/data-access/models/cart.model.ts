export interface CartItem {
  productId: string;
  productSlug: string;
  productName: string;
  variantId: string;
  variantName: string;
  image: string;
  unitPrice: number;
  originalPrice?: number;
  quantity: number;
  maxQuantity: number;
  addedAt: string;
  updatedAt: string;
}

export interface CartItemDraft {
  productId: string;
  productSlug: string;
  productName: string;
  variantId: string;
  variantName: string;
  image: string;
  unitPrice: number;
  originalPrice?: number;
  quantity: number;
  maxQuantity: number;
}

export interface StoredCart {
  items: CartItem[];
  updatedAt: string;
}
