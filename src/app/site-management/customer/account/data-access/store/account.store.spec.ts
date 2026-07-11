import { TestBed } from '@angular/core/testing';
import { AccountStore } from '@/site-management/customer/account/data-access/store/account.store';

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

    store.setVoucherTab('used');

    expect(store.filteredVouchers().every(voucher => voucher.status === 'used')).toBe(true);
  });

  it('derives the default address from the address entity collection', () => {
    const store = configureStore();

    expect(store.defaultAddress()?.isDefault).toBe(true);
  });

  it('searches order history by id and product name', () => {
    const store = configureStore();

    store.setOrderSearchKeyword('Mercury');

    expect(store.filteredOrders().map(order => order.orderId)).toEqual(['KN-9012338']);
  });
});
