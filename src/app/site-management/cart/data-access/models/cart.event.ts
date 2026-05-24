import { CartItem, CartItemDraft } from './cart.model';

export enum CartEventType {
  CartLoaded = 'Cart Loaded',
  ItemAdded = 'Item Added',
  QuantityChanged = 'Quantity Changed',
  ItemRemoved = 'Item Removed',
  CartCleared = 'Cart Cleared',
  CartPersistFailed = 'Cart Persist Failed',
}

export type CartEvent =
  | { type: CartEventType.CartLoaded; customerKey: string | null; items: CartItem[] }
  | { type: CartEventType.ItemAdded; item: CartItemDraft; timestamp: string }
  | { type: CartEventType.QuantityChanged; variantId: string; quantity: number; timestamp: string }
  | { type: CartEventType.ItemRemoved; variantId: string }
  | { type: CartEventType.CartCleared }
  | { type: CartEventType.CartPersistFailed; error: string };
