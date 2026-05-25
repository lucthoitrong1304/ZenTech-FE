import { TestBed } from '@angular/core/testing';
import { AccountEventType } from '../models/account.event';
import { AccountStore } from './account.store';

describe('AccountStore', () => {
  function configureStore(): InstanceType<typeof AccountStore> {
    TestBed.configureTestingModule({
      providers: [AccountStore],
    });

    return TestBed.inject(AccountStore);
  }

  it('hydrates mock account collections for the overview', () => {
    const store = configureStore();

    expect(store.profile()?.fullName).toBeTruthy();
    expect(store.orders().length).toBeGreaterThan(0);
    expect(store.addresses().some(address => address.isDefault)).toBe(true);
    expect(store.activeVoucherCount()).toBeGreaterThan(0);
  });

  it('filters vouchers by the selected wallet tab', () => {
    const store = configureStore();

    store.dispatch({ type: AccountEventType.VoucherTabChanged, status: 'used' });

    expect(store.filteredVouchers().every(voucher => voucher.status === 'used')).toBe(true);
  });

  it('updates the default address with entity updaters', () => {
    const store = configureStore();

    store.dispatch({
      type: AccountEventType.AddressDefaultChanged,
      addressId: 'address-hq',
    });

    expect(store.defaultAddress()?.addressId).toBe('address-hq');
    expect(store.addresses().filter(address => address.isDefault)).toHaveLength(1);
  });

  it('searches order history by id and product name', () => {
    const store = configureStore();

    store.dispatch({
      type: AccountEventType.OrderSearchChanged,
      keyword: 'Mercury',
    });

    expect(store.filteredOrders().map(order => order.orderId)).toEqual(['KN-9012338']);
  });
});
