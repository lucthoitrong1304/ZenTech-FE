import { TestBed } from '@angular/core/testing';
import { AuthStorageService, StoredAuthSession } from '../../../../core/services/auth-storage.service';
import { CartItemDraft } from '../models/cart.model';
import { CartStore } from './cart.store';

const session: StoredAuthSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  tokenType: 'Bearer',
  accountId: 'account-1',
  profileId: 'customer-1',
  email: 'customer@example.com',
  fullName: 'Customer One',
  roles: ['CUSTOMER'],
};

describe('CartStore', () => {
  function configureStore(authSession: StoredAuthSession | null = session): InstanceType<typeof CartStore> {
    TestBed.configureTestingModule({
      providers: [
        CartStore,
        {
          provide: AuthStorageService,
          useValue: {
            getSession: () => authSession,
          } satisfies Partial<AuthStorageService>,
        },
      ],
    });

    return TestBed.inject(CartStore);
  }

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('loads persisted cart items for the current customer', () => {
    localStorage.setItem(
      'zentech_cart:customer-1',
      JSON.stringify({
        items: [
          {
            ...createDraft({ quantity: 2 }),
            addedAt: '2026-05-24T00:00:00.000Z',
            updatedAt: '2026-05-24T00:00:00.000Z',
          },
        ],
        updatedAt: '2026-05-24T00:00:00.000Z',
      })
    );

    const store = configureStore();

    expect(store.items().length).toBe(1);
    expect(store.itemCount()).toBe(2);
    expect(store.subtotal()).toBe(180);
  });

  it('adds a new variant and persists it', () => {
    const store = configureStore();

    store.addItem(createDraft({ quantity: 1 }));

    expect(store.items()[0]).toMatchObject({
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
    });
    expect(JSON.parse(localStorage.getItem('zentech_cart:customer-1') || '{}').items).toHaveLength(1);
  });

  it('increments an existing variant up to its max quantity', () => {
    const store = configureStore();

    store.addItem(createDraft({ quantity: 2, maxQuantity: 3 }));
    store.addItem(createDraft({ quantity: 2, maxQuantity: 3 }));

    expect(store.items()[0].quantity).toBe(3);
    expect(store.itemCount()).toBe(3);
  });

  it('keeps quantity changes within item boundaries', () => {
    const store = configureStore();

    store.addItem(createDraft({ quantity: 1, maxQuantity: 2 }));
    store.decrementItem('variant-1');
    expect(store.items()[0].quantity).toBe(1);

    store.incrementItem('variant-1');
    store.incrementItem('variant-1');
    expect(store.items()[0].quantity).toBe(2);
  });

  it('removes items and clears persisted cart', () => {
    const store = configureStore();

    store.addItem(createDraft({ quantity: 1 }));
    store.removeItem('variant-1');

    expect(store.items()).toEqual([]);
    expect(JSON.parse(localStorage.getItem('zentech_cart:customer-1') || '{}').items).toEqual([]);

    store.addItem(createDraft({ quantity: 1 }));
    store.clearCart();

    expect(store.items()).toEqual([]);
    expect(localStorage.getItem('zentech_cart:customer-1')).toBeNull();
  });

  it('clears corrupted cart storage for only the current customer', () => {
    localStorage.setItem('zentech_cart:customer-1', '{bad json');
    localStorage.setItem('zentech_cart:other-customer', '{bad json');

    const store = configureStore();

    expect(store.items()).toEqual([]);
    expect(localStorage.getItem('zentech_cart:customer-1')).toBeNull();
    expect(localStorage.getItem('zentech_cart:other-customer')).toBe('{bad json');
  });
});

function createDraft(overrides: Partial<CartItemDraft> = {}): CartItemDraft {
  return {
    productId: 'product-1',
    productSlug: 'product-1',
    productName: 'Alpha Keyboard',
    variantId: 'variant-1',
    variantName: 'Black',
    image: '/alpha.webp',
    unitPrice: 90,
    originalPrice: 100,
    quantity: 1,
    maxQuantity: 5,
    ...overrides,
  };
}
