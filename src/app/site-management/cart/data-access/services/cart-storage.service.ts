import { Injectable, inject } from '@angular/core';
import { AuthStorageService } from '../../../../core/services/auth-storage.service';
import { CartItem, StoredCart } from '../models/cart.model';

const CART_KEY_PREFIX = 'zentech_cart';

@Injectable({
  providedIn: 'root',
})
export class CartStorageService {
  private readonly authStorageService = inject(AuthStorageService);

  getCustomerKey(): string | null {
    const session = this.authStorageService.getSession();
    const customerId = session?.profileId || session?.accountId;

    return customerId ? `${CART_KEY_PREFIX}:${customerId}` : null;
  }

  loadItems(customerKey = this.getCustomerKey()): CartItem[] {
    if (!customerKey) {
      return [];
    }

    const storage = this.getStorage();

    if (!storage) {
      return [];
    }

    const rawCart = storage.getItem(customerKey);

    if (!rawCart) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawCart) as StoredCart;
      return Array.isArray(parsed.items) ? parsed.items.filter(isCartItem) : [];
    } catch {
      storage.removeItem(customerKey);
      return [];
    }
  }

  saveItems(items: CartItem[], customerKey = this.getCustomerKey()): void {
    if (!customerKey) {
      return;
    }

    const storage = this.getStorage();

    if (!storage) {
      return;
    }

    const cart: StoredCart = {
      items,
      updatedAt: new Date().toISOString(),
    };

    storage.setItem(customerKey, JSON.stringify(cart));
  }

  clear(customerKey = this.getCustomerKey()): void {
    if (!customerKey) {
      return;
    }

    this.getStorage()?.removeItem(customerKey);
  }

  private getStorage(): Storage | null {
    try {
      return globalThis.localStorage ?? null;
    } catch {
      return null;
    }
  }
}

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const item = value as Partial<CartItem>;

  return (
    typeof item.productId === 'string' &&
    typeof item.productSlug === 'string' &&
    typeof item.productName === 'string' &&
    typeof item.variantId === 'string' &&
    typeof item.variantName === 'string' &&
    typeof item.image === 'string' &&
    typeof item.unitPrice === 'number' &&
    typeof item.quantity === 'number' &&
    typeof item.maxQuantity === 'number' &&
    typeof item.addedAt === 'string' &&
    typeof item.updatedAt === 'string'
  );
}
