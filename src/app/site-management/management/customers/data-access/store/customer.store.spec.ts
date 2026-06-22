import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import {
  CustomerDetail,
  CustomerOrderHistory,
  CustomerPage,
  CustomerSummary,
} from '../models/customer.models';
import { CustomerService } from '../services/customer.service';
import { CustomerStore } from './customer.store';

describe('CustomerStore', () => {
  function configureStore(
    customerService: Partial<CustomerService>
  ): InstanceType<typeof CustomerStore> {
    TestBed.configureTestingModule({
      providers: [
        CustomerStore,
        {
          provide: CustomerService,
          useValue: customerService,
        },
      ],
    });

    return TestBed.inject(CustomerStore);
  }

  it('loads customer list into state', () => {
    const getCustomers = vi.fn(() => of(createCustomerPage([createCustomerSummary()])));
    const store = configureStore({ getCustomers });

    store.loadCustomers();

    expect(getCustomers).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      sort: 'registeredAt,desc',
      keyword: '',
      activeFilter: 'all',
    });
    expect(store.loading()).toBe(false);
    expect(store.customers().map(customer => customer.customerId)).toEqual(['customer-1']);
    expect(store.totalElements()).toBe(1);
    expect(store.isEmpty()).toBe(false);
  });

  it('stores a concise error when customer list fails', () => {
    const store = configureStore({
      getCustomers: () => throwError(() => new Error('Network failed')),
    });

    store.loadCustomers();

    expect(store.loading()).toBe(false);
    expect(store.customers()).toEqual([]);
    expect(store.error()).toBe('Không thể tải danh sách khách hàng lúc này.');
    expect(store.isEmpty()).toBe(true);
  });

  it('reloads page zero when filters change', () => {
    const getCustomers = vi.fn(() => of(createCustomerPage([createCustomerSummary()])));
    const store = configureStore({ getCustomers });

    store.setActiveFilter('inactive');
    store.setKeyword('alice');
    store.setSort('email,asc');
    store.setPage(2, 10);

    expect(getCustomers).toHaveBeenLastCalledWith({
      page: 2,
      size: 10,
      sort: 'email,asc',
      keyword: 'alice',
      activeFilter: 'inactive',
    });
    expect(store.query()).toEqual({
      page: 0,
      size: 10,
      sort: 'email,asc',
      keyword: 'alice',
      activeFilter: 'inactive',
    });
  });

  it('loads selected customer detail with order history', () => {
    const getCustomerDetail = vi.fn(() => of(createCustomerDetail()));
    const getCustomerOrders = vi.fn(() => of(createOrdersPage([createOrderHistory()])));
    const store = configureStore({
      getCustomers: () => of(createCustomerPage([])),
      getCustomerDetail,
      getCustomerOrders,
    });

    store.loadSelectedCustomer('customer-1');

    expect(getCustomerDetail).toHaveBeenCalledWith('customer-1');
    expect(getCustomerOrders).toHaveBeenCalledWith('customer-1', {
      page: 0,
      size: 5,
      sort: 'createdAt,desc',
    });
    expect(store.selectedCustomer()?.customerId).toBe('customer-1');
    expect(store.orders()[0].orderId).toBe('order-1');
    expect(store.selectedCustomerVisible()).toBe(true);
  });

  it('updates customer status and reloads list plus open detail', () => {
    const updateCustomerStatus = vi.fn(() => of(undefined));
    const getCustomers = vi.fn(() => of(createCustomerPage([createCustomerSummary()])));
    const getCustomerDetail = vi.fn(() => of(createCustomerDetail()));
    const getCustomerOrders = vi.fn(() => of(createOrdersPage([createOrderHistory()])));
    const store = configureStore({
      updateCustomerStatus,
      getCustomers,
      getCustomerDetail,
      getCustomerOrders,
    });

    store.loadSelectedCustomer('customer-1');
    store.updateCustomerStatus({ customerId: 'customer-1', active: false });

    expect(updateCustomerStatus).toHaveBeenCalledWith('customer-1', false);
    expect(getCustomers).toHaveBeenCalled();
    expect(getCustomerDetail).toHaveBeenCalledTimes(2);
    expect(getCustomerOrders).toHaveBeenCalledTimes(2);
    expect(store.successMessage()).toBe('Khóa tài khoản khách hàng thành công.');
  });
});

function createCustomerSummary(): CustomerSummary {
  return {
    customerId: 'customer-1',
    fullName: 'Alice Nguyen',
    email: 'alice@example.com',
    active: true,
    registeredAt: '2026-04-15T10:15:30Z',
    totalOrders: 3,
    totalSpent: 1500000,
    lastOrderAt: '2026-04-16T08:00:00Z',
    imageUrl: null,
  };
}

function createCustomerDetail(): CustomerDetail {
  return {
    ...createCustomerSummary(),
    addressList: [
      {
        addressId: 'address-1',
        phoneNumber: '0909000000',
        province: 'Ho Chi Minh',
        ward: 'Ward 1',
        street: '1 Nguyen Hue',
        isDefault: true,
        createdAt: '2026-04-15T10:20:00Z',
        updatedAt: null,
      },
    ],
  };
}

function createOrderHistory(): CustomerOrderHistory {
  return {
    orderId: 'order-1',
    createdAt: '2026-04-16T08:00:00Z',
    orderStatus: 'COMPLETED',
    paymentStatus: 'SUCCESS',
    paymentMethod: 'VNPAY',
    finalPrice: 500000,
    shippingFee: 20000,
    discountAmount: 0,
    items: [],
  };
}

function createCustomerPage(
  content: CustomerSummary[]
): CustomerPage<CustomerSummary> {
  return {
    content,
    page: 0,
    size: 10,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    last: true,
  };
}

function createOrdersPage(
  content: CustomerOrderHistory[]
): CustomerPage<CustomerOrderHistory> {
  return {
    content,
    page: 0,
    size: 5,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    last: true,
  };
}
