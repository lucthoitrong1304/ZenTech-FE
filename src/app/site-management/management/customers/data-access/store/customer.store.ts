import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, forkJoin, map, pipe, switchMap, tap } from 'rxjs';
import {
  CustomerActiveFilter,
  CustomerDetail,
  CustomerListQuery,
  CustomerOrderHistory,
  CustomerOrderQuery,
  CustomerPage,
  CustomerSort,
  CustomerSummary,
} from '../models/customer.models';
import { CustomerEvent, CustomerEventType } from '../models/customer.event';
import { CustomerService } from '../services/customer.service';

interface CustomerUiState {
  query: CustomerListQuery;
  totalElements: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  selectedCustomerId: string | null;
  selectedCustomer: CustomerDetail | null;
  selectedCustomerLoading: boolean;
  selectedCustomerError: string | null;
  ordersQuery: CustomerOrderQuery;
  ordersTotalElements: number;
  ordersTotalPages: number;
  ordersLoading: boolean;
  successMessage: string | null;
  statusErrorMessage: string | null;
}

const CUSTOMER_ENTITY_CONFIG = {
  collection: 'customer',
  selectId: (customer: CustomerSummary) => customer.customerId,
} as const;

const ORDER_ENTITY_CONFIG = {
  collection: 'order',
  selectId: (order: CustomerOrderHistory) => order.orderId,
} as const;

const DEFAULT_QUERY: CustomerListQuery = {
  page: 0,
  size: 10,
  sort: 'registeredAt,desc',
  keyword: '',
  activeFilter: 'all',
};

const DEFAULT_ORDERS_QUERY: CustomerOrderQuery = {
  page: 0,
  size: 5,
  sort: 'createdAt,desc',
};

const INITIAL_STATE: CustomerUiState = {
  query: DEFAULT_QUERY,
  totalElements: 0,
  totalPages: 0,
  loading: false,
  error: null,
  selectedCustomerId: null,
  selectedCustomer: null,
  selectedCustomerLoading: false,
  selectedCustomerError: null,
  ordersQuery: DEFAULT_ORDERS_QUERY,
  ordersTotalElements: 0,
  ordersTotalPages: 0,
  ordersLoading: false,
  successMessage: null,
  statusErrorMessage: null,
};

export const CustomerStore = signalStore(
  withState<CustomerUiState>(INITIAL_STATE),
  withEntities<CustomerSummary, 'customer'>({
    entity: {} as CustomerSummary,
    collection: 'customer',
  }),
  withEntities<CustomerOrderHistory, 'order'>({
    entity: {} as CustomerOrderHistory,
    collection: 'order',
  }),
  withComputed(({ customerEntities, orderEntities, loading, totalElements, selectedCustomer }) => ({
    customers: computed(() => customerEntities()),
    orders: computed(() => orderEntities()),
    isEmpty: computed(() => !loading() && customerEntities().length === 0),
    hasCustomers: computed(() => customerEntities().length > 0),
    customerCountLabel: computed(() => `${totalElements()} khách hàng`),
    selectedCustomerVisible: computed(() => selectedCustomer() !== null),
    selectedCustomerAddressCount: computed(() => selectedCustomer()?.addressList.length ?? 0),
    selectedCustomerOrderCount: computed(() => orderEntities().length),
  })),
  withMethods((store, customerService = inject(CustomerService)) => {
    const applyCustomersPage = (page: CustomerPage<CustomerSummary>): void => {
      patchState(
        store,
        setAllEntities(page.content, CUSTOMER_ENTITY_CONFIG),
        {
          query: {
            ...store.query(),
            page: page.page,
            size: page.size,
          },
          totalElements: page.totalElements,
          totalPages: page.totalPages,
          loading: false,
          error: null,
        }
      );
    };

    const applyOrdersPage = (page: CustomerPage<CustomerOrderHistory>): void => {
      patchState(
        store,
        setAllEntities(page.content, ORDER_ENTITY_CONFIG),
        {
          ordersQuery: {
            ...store.ordersQuery(),
            page: page.page,
            size: page.size,
          },
          ordersTotalElements: page.totalElements,
          ordersTotalPages: page.totalPages,
          ordersLoading: false,
        }
      );
    };

    const handleEvent = (event: CustomerEvent): void => {
      switch (event.type) {
        case CustomerEventType.CustomersLoadStarted:
          patchState(store, { loading: true, error: null });
          break;

        case CustomerEventType.CustomersLoadSucceeded:
          applyCustomersPage(event.page);
          break;

        case CustomerEventType.CustomersLoadFailed:
          patchState(
            store,
            removeAllEntities(CUSTOMER_ENTITY_CONFIG),
            {
              totalElements: 0,
              totalPages: 0,
              loading: false,
              error: 'Không thể tải danh sách khách hàng lúc này.',
            }
          );
          break;

        case CustomerEventType.CustomerSelected:
          patchState(
            store,
            removeAllEntities(ORDER_ENTITY_CONFIG),
            {
              selectedCustomerId: event.customerId,
              selectedCustomer: null,
              selectedCustomerLoading: true,
              selectedCustomerError: null,
              ordersTotalElements: 0,
              ordersTotalPages: 0,
              ordersLoading: true,
              ordersQuery: DEFAULT_ORDERS_QUERY,
            }
          );
          break;

        case CustomerEventType.CustomerDetailLoadSucceeded:
          patchState(store, {
            selectedCustomer: event.detail,
            selectedCustomerLoading: false,
            selectedCustomerError: null,
          });
          applyOrdersPage(event.orders);
          break;

        case CustomerEventType.CustomerDetailLoadFailed:
          patchState(
            store,
            removeAllEntities(ORDER_ENTITY_CONFIG),
            {
              selectedCustomer: null,
              selectedCustomerLoading: false,
              selectedCustomerError: 'Không thể tải hồ sơ khách hàng lúc này.',
              ordersLoading: false,
              ordersTotalElements: 0,
              ordersTotalPages: 0,
            }
          );
          break;

        case CustomerEventType.OrdersLoadStarted:
          patchState(store, { ordersLoading: true });
          break;

        case CustomerEventType.OrdersLoadSucceeded:
          applyOrdersPage(event.page);
          break;

        case CustomerEventType.OrdersLoadFailed:
          patchState(
            store,
            removeAllEntities(ORDER_ENTITY_CONFIG),
            {
              ordersLoading: false,
              ordersTotalElements: 0,
              ordersTotalPages: 0,
            }
          );
          break;

        case CustomerEventType.SearchKeywordChanged:
          patchState(store, {
            query: {
              ...store.query(),
              keyword: event.keyword,
              page: 0,
            },
          });
          break;

        case CustomerEventType.ActiveFilterChanged:
          patchState(store, {
            query: {
              ...store.query(),
              activeFilter: event.activeFilter,
              page: 0,
            },
          });
          break;

        case CustomerEventType.SortChanged:
          patchState(store, {
            query: {
              ...store.query(),
              sort: event.sort,
              page: 0,
            },
          });
          break;

        case CustomerEventType.PageChanged:
          patchState(store, {
            query: {
              ...store.query(),
              ...event.query,
            },
          });
          break;

        case CustomerEventType.OrdersPageChanged:
          patchState(store, {
            ordersQuery: {
              ...store.ordersQuery(),
              ...event.query,
            },
          });
          break;

        case CustomerEventType.SelectedCustomerClosed:
          patchState(
            store,
            removeAllEntities(ORDER_ENTITY_CONFIG),
            {
              selectedCustomerId: null,
              selectedCustomer: null,
              selectedCustomerLoading: false,
              selectedCustomerError: null,
              ordersTotalElements: 0,
              ordersTotalPages: 0,
              ordersLoading: false,
              ordersQuery: DEFAULT_ORDERS_QUERY,
            }
          );
          break;

        case CustomerEventType.CustomerStatusChangeSucceeded:
          patchState(store, {
            successMessage: event.active
              ? 'Mở khóa tài khoản khách hàng thành công.'
              : 'Khóa tài khoản khách hàng thành công.',
            statusErrorMessage: null,
          });
          break;

        case CustomerEventType.CustomerStatusChangeFailed:
          patchState(store, {
            statusErrorMessage: event.active
              ? 'Không thể mở khóa tài khoản khách hàng lúc này.'
              : 'Không thể khóa tài khoản khách hàng lúc này.',
          });
          break;

        case CustomerEventType.MessagesCleared:
          patchState(store, { successMessage: null, statusErrorMessage: null });
          break;
      }
    };

    const loadCustomers = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: CustomerEventType.CustomersLoadStarted })),
        switchMap(() =>
          customerService.getCustomers(store.query()).pipe(
            tap({
              next: page => handleEvent({ type: CustomerEventType.CustomersLoadSucceeded, page }),
              error: () => handleEvent({ type: CustomerEventType.CustomersLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadSelectedCustomer = rxMethod<string>(
      pipe(
        tap(customerId => handleEvent({ type: CustomerEventType.CustomerSelected, customerId })),
        switchMap(customerId =>
          forkJoin({
            detail: customerService.getCustomerDetail(customerId),
            orders: customerService.getCustomerOrders(customerId, DEFAULT_ORDERS_QUERY),
          }).pipe(
            tap({
              next: ({ detail, orders }) =>
                handleEvent({
                  type: CustomerEventType.CustomerDetailLoadSucceeded,
                  detail,
                  orders,
                }),
              error: () => handleEvent({ type: CustomerEventType.CustomerDetailLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadOrders = rxMethod<void>(
      pipe(
        switchMap(() => {
          const customerId = store.selectedCustomerId();

          if (!customerId) {
            return EMPTY;
          }

          handleEvent({ type: CustomerEventType.OrdersLoadStarted });

          return customerService.getCustomerOrders(customerId, store.ordersQuery()).pipe(
            tap({
              next: page => handleEvent({ type: CustomerEventType.OrdersLoadSucceeded, page }),
              error: () => handleEvent({ type: CustomerEventType.OrdersLoadFailed }),
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    const updateCustomerStatus = rxMethod<{ customerId: string; active: boolean }>(
      pipe(
        switchMap(({ customerId, active }) =>
          customerService.updateCustomerStatus(customerId, active).pipe(
            tap({
              next: () => {
                handleEvent({
                  type: CustomerEventType.CustomerStatusChangeSucceeded,
                  active,
                });
                loadCustomers();

                if (store.selectedCustomerId() === customerId) {
                  loadSelectedCustomer(customerId);
                }
              },
              error: () =>
                handleEvent({
                  type: CustomerEventType.CustomerStatusChangeFailed,
                  active,
                }),
            }),
            map(() => undefined),
            catchError(() => EMPTY)
          )
        )
      )
    );

    return {
      dispatch: handleEvent,
      loadCustomers,
      loadSelectedCustomer,
      loadOrders,
      updateCustomerStatus,
      setKeyword(keyword: string): void {
        handleEvent({ type: CustomerEventType.SearchKeywordChanged, keyword });
        loadCustomers();
      },
      setActiveFilter(activeFilter: CustomerActiveFilter): void {
        handleEvent({ type: CustomerEventType.ActiveFilterChanged, activeFilter });
        loadCustomers();
      },
      setSort(sort: CustomerSort): void {
        handleEvent({ type: CustomerEventType.SortChanged, sort });
        loadCustomers();
      },
      setPage(page: number, size = store.query().size): void {
        handleEvent({ type: CustomerEventType.PageChanged, query: { page, size } });
        loadCustomers();
      },
      setOrdersPage(page: number, size = store.ordersQuery().size): void {
        handleEvent({ type: CustomerEventType.OrdersPageChanged, query: { page, size } });
        loadOrders();
      },
      closeSelectedCustomer(): void {
        handleEvent({ type: CustomerEventType.SelectedCustomerClosed });
      },
      clearMessages(): void {
        handleEvent({ type: CustomerEventType.MessagesCleared });
      },
      refresh(): void {
        loadCustomers();

        const customerId = store.selectedCustomerId();

        if (customerId) {
          loadSelectedCustomer(customerId);
        }
      },
    };
  })
);
