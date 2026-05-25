import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  removeAllEntities,
  removeEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { CartEvent, CartEventType } from '../models/cart.event';
import { CartItem, CartItemDraft } from '../models/cart.model';
import { CartStorageService } from '../services/cart-storage.service';

interface CartState {
  customerKey: string | null;
  persistError: string | null;
}

const CART_ENTITY_CONFIG = {
  collection: 'cartItem',
  selectId: (item: CartItem) => item.variantId,
} as const;

const INITIAL_STATE: CartState = {
  customerKey: null,
  persistError: null,
};

export const CartStore = signalStore(
  { providedIn: 'root' },
  withState<CartState>(INITIAL_STATE),
  withEntities<CartItem, 'cartItem'>({
    entity: {} as CartItem,
    collection: 'cartItem',
  }),
  withComputed(({ cartItemEntities }) => ({
    items: computed(() =>
      [...cartItemEntities()].sort(
        (first, second) =>
          new Date(first.addedAt).getTime() - new Date(second.addedAt).getTime()
      )
    ),
    itemCount: computed(() =>
      cartItemEntities().reduce((total, item) => total + item.quantity, 0)
    ),
    subtotal: computed(() =>
      cartItemEntities().reduce((total, item) => total + item.unitPrice * item.quantity, 0)
    ),
    total: computed(() =>
      cartItemEntities().reduce((total, item) => total + item.unitPrice * item.quantity, 0)
    ),
    isEmpty: computed(() => cartItemEntities().length === 0),
  })),
  withMethods((store, cartStorageService = inject(CartStorageService)) => {
    const persist = (): void => {
      try {
        cartStorageService.saveItems(store.items(), store.customerKey());
        patchState(store, { persistError: null });
      } catch {
        handleEvent({
          type: CartEventType.CartPersistFailed,
          error: 'Khong the luu gio hang tren trinh duyet nay.',
        });
      }
    };

    const loadForCurrentCustomer = (): void => {
      const customerKey = cartStorageService.getCustomerKey();
      const items = cartStorageService.loadItems(customerKey);
      handleEvent({ type: CartEventType.CartLoaded, customerKey, items });
    };

    const ensureCurrentCustomer = (): void => {
      const customerKey = cartStorageService.getCustomerKey();

      if (customerKey !== store.customerKey()) {
        loadForCurrentCustomer();
      }
    };

    const handleEvent = (event: CartEvent): void => {
      switch (event.type) {
        case CartEventType.CartLoaded:
          patchState(
            store,
            setAllEntities(
              event.items.map(item => normalizeCartItem(item)),
              CART_ENTITY_CONFIG
            ),
            {
              customerKey: event.customerKey,
              persistError: null,
            }
          );
          break;

        case CartEventType.ItemAdded: {
          const existingItem = store
            .items()
            .find(item => item.variantId === event.item.variantId);

          if (existingItem) {
            patchState(
              store,
              updateEntity(
                {
                  id: existingItem.variantId,
                  changes: {
                    quantity: clampQuantity(
                      existingItem.quantity + event.item.quantity,
                      existingItem.maxQuantity
                    ),
                    updatedAt: event.timestamp,
                  },
                },
                CART_ENTITY_CONFIG
              )
            );
            break;
          }

          patchState(
            store,
            addEntity(
              normalizeCartItem({
                ...event.item,
                quantity: clampQuantity(event.item.quantity, event.item.maxQuantity),
                addedAt: event.timestamp,
                updatedAt: event.timestamp,
              }),
              CART_ENTITY_CONFIG
            )
          );
          break;
        }

        case CartEventType.QuantityChanged:
          patchState(
            store,
            updateEntity(
              {
                id: event.variantId,
                changes: item => ({
                  quantity: clampQuantity(event.quantity, item.maxQuantity),
                  updatedAt: event.timestamp,
                }),
              },
              CART_ENTITY_CONFIG
            )
          );
          break;

        case CartEventType.ItemRemoved:
          patchState(store, removeEntity(event.variantId, CART_ENTITY_CONFIG));
          break;

        case CartEventType.CartCleared:
          patchState(store, removeAllEntities(CART_ENTITY_CONFIG));
          break;

        case CartEventType.CartPersistFailed:
          patchState(store, { persistError: event.error });
          break;
      }
    };

    const setQuantity = (variantId: string, quantity: number): void => {
      ensureCurrentCustomer();

      if (!store.items().some(item => item.variantId === variantId)) {
        return;
      }

      handleEvent({
        type: CartEventType.QuantityChanged,
        variantId,
        quantity,
        timestamp: new Date().toISOString(),
      });
      persist();
    };

    return {
      dispatch: handleEvent,
      loadForCurrentCustomer,
      addItem(item: CartItemDraft): void {
        ensureCurrentCustomer();

        if (!store.customerKey() || item.maxQuantity <= 0 || item.quantity <= 0) {
          return;
        }

        handleEvent({
          type: CartEventType.ItemAdded,
          item,
          timestamp: new Date().toISOString(),
        });
        persist();
      },
      setQuantity,
      incrementItem(variantId: string): void {
        const item = store.items().find(cartItem => cartItem.variantId === variantId);

        if (!item) {
          return;
        }

        setQuantity(variantId, item.quantity + 1);
      },
      decrementItem(variantId: string): void {
        const item = store.items().find(cartItem => cartItem.variantId === variantId);

        if (!item) {
          return;
        }

        setQuantity(variantId, item.quantity - 1);
      },
      removeItem(variantId: string): void {
        ensureCurrentCustomer();
        handleEvent({ type: CartEventType.ItemRemoved, variantId });
        persist();
      },
      clearCart(): void {
        ensureCurrentCustomer();
        handleEvent({ type: CartEventType.CartCleared });
        cartStorageService.clear(store.customerKey());
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadForCurrentCustomer();
    },
  })
);

function clampQuantity(quantity: number, maxQuantity: number): number {
  return Math.max(1, Math.min(quantity, maxQuantity));
}

function normalizeCartItem(item: CartItem): CartItem {
  return {
    ...item,
    quantity: clampQuantity(item.quantity, item.maxQuantity),
  };
}
