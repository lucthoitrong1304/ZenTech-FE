import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import {
  ManagementOrder,
  ManagementOrderEditDraft,
  ManagementOrderPage,
  ManagementOrderQuery,
} from '../models/management-order.models';
import { ManagementOrderService } from '../services/management-order.service';
import { ManagementOrdersStore } from './management-orders.store';

describe('ManagementOrdersStore', () => {
  beforeAll(() => {
    try {
      getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch (error) {
      if (!(error instanceof Error) || !isTestEnvironmentAlreadyInitialized(error)) {
        throw error;
      }
    }
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function configureStore(
    orderService: Partial<ManagementOrderService>
  ): InstanceType<typeof ManagementOrdersStore> {
    TestBed.configureTestingModule({
      providers: [
        ManagementOrdersStore,
        {
          provide: ManagementOrderService,
          useValue: orderService,
        },
      ],
    });

    return TestBed.inject(ManagementOrdersStore);
  }

  it('loads mock orders into entity state with pagination', () => {
    const order = createOrder();
    const getOrders = vi.fn((query: ManagementOrderQuery) => of(createPage([order], query)));
    const store = configureStore({ getOrders });

    store.loadOrders();

    expect(getOrders).toHaveBeenCalledWith({
      page: 0,
      size: 4,
      sort: 'createdAt,desc',
      keyword: '',
      status: 'all',
      dateFilter: 'all',
    });
    expect(store.loading()).toBe(false);
    expect(store.orders().map(item => item.orderId)).toEqual(['order-1']);
    expect(store.totalElements()).toBe(1);
    expect(store.pageStart()).toBe(1);
    expect(store.pageEnd()).toBe(1);
  });

  it('resets to page zero when search or status filters change', () => {
    const getOrders = vi.fn((query: ManagementOrderQuery) => of(createPage([createOrder()], query, 12)));
    const store = configureStore({ getOrders });

    store.loadOrders();
    store.goToPage(2);
    store.setKeyword('phong');
    store.setStatusFilter('CONFIRMED');

    expect(store.query()).toEqual({
      page: 0,
      size: 4,
      sort: 'createdAt,desc',
      keyword: 'phong',
      status: 'CONFIRMED',
      dateFilter: 'all',
    });
    expect(store.activeFilterCount()).toBe(2);
  });

  it('opens detail and edit drawer with selected order state', () => {
    const order = createOrder();
    const getOrderDetail = vi.fn(() => of(order));
    const store = configureStore({
      getOrders: query => of(createPage([order], query)),
      getOrderDetail,
    });

    store.loadOrders();
    store.openDetail(order.orderId);

    expect(getOrderDetail).toHaveBeenCalledWith(order.orderId);
    expect(store.selectedOrder()?.orderId).toBe(order.orderId);
    expect(store.detailDrawerOpen()).toBe(true);

    store.openEdit(order);

    expect(store.editDrawerOpen()).toBe(true);
    expect(store.editDraft()).toMatchObject({
      orderId: order.orderId,
      customerName: order.customer.fullName,
      shippingAddress: order.customer.shippingAddress,
      orderStatus: order.orderStatus,
    });
  });

  it('updates the entity after submitting the edit draft', () => {
    const order = createOrder();
    const updated = {
      ...order,
      customer: {
        ...order.customer,
        fullName: 'Le Hong Phong Updated',
      },
    };
    const updateOrder = vi.fn((draft: ManagementOrderEditDraft) =>
      of({
        ...updated,
        customer: {
          ...updated.customer,
          fullName: draft.customerName,
        },
      })
    );
    const store = configureStore({
      getOrders: query => of(createPage([order], query)),
      getOrderDetail: () => of(order),
      updateOrder,
    });

    store.loadOrders();
    store.openEdit(order);
    store.updateEditDraft({ customerName: 'Le Hong Phong Updated' });
    store.saveEditDraft();

    expect(updateOrder).toHaveBeenCalledWith({
      orderId: order.orderId,
      customerName: 'Le Hong Phong Updated',
      shippingAddress: order.customer.shippingAddress,
      orderStatus: order.orderStatus,
      items: [{ orderItemId: 'item-1', quantity: 1 }],
    });
    expect(store.orders()[0].customer.fullName).toBe('Le Hong Phong Updated');
    expect(store.editDrawerOpen()).toBe(false);
    expect(store.successMessage()).toBe('Da luu thay doi don hang.');
  });

  it('cancels edit without mutating the selected order', () => {
    const order = createOrder();
    const store = configureStore({
      getOrders: query => of(createPage([order], query)),
      getOrderDetail: () => of(order),
    });

    store.loadOrders();
    store.openEdit(order);
    store.updateEditDraft({ customerName: 'Different Name' });
    store.cancelEdit();

    expect(store.orders()[0].customer.fullName).toBe(order.customer.fullName);
    expect(store.editDraft()).toBeNull();
    expect(store.drawerMode()).toBeNull();
  });

  it('stores an error when loading orders fails', () => {
    const store = configureStore({
      getOrders: () => throwError(() => new Error('Network failed')),
    });

    store.loadOrders();

    expect(store.loading()).toBe(false);
    expect(store.errorMessage()).toBe('Khong the tai danh sach don hang. Vui long thu lai.');
  });
});

function isTestEnvironmentAlreadyInitialized(error: Error): boolean {
  return (
    error.message.includes('already been initialized') ||
    error.message.includes('already been called')
  );
}

function createOrder(): ManagementOrder {
  return {
    orderId: 'order-1',
    orderCode: 'ORD-5501',
    createdAt: '2026-05-25T14:30:00+07:00',
    customer: {
      fullName: 'Le Hong Phong',
      email: 'phong.le@example.com',
      shippingAddress: '123 Duong Le Loi, Quan 1, TP. Ho Chi Minh',
    },
    paymentMethod: 'MOMO',
    paymentStatus: 'SUCCESS',
    orderStatus: 'CONFIRMED',
    subtotal: 3500000,
    shippingFee: 30000,
    discountAmount: 0,
    finalPrice: 3530000,
    items: [
      {
        orderItemId: 'item-1',
        productName: 'Ban phim V60 Pro HE',
        variantName: 'Limited',
        productImage: null,
        quantity: 1,
        unitPrice: 3500000,
      },
    ],
  };
}

function createPage(
  orders: ManagementOrder[],
  query: ManagementOrderQuery,
  totalElements = orders.length
): ManagementOrderPage {
  return {
    orders,
    page: query.page,
    size: query.size,
    totalElements,
    totalPages: Math.ceil(totalElements / query.size),
    last: query.page + 1 >= Math.ceil(totalElements / query.size),
  };
}
