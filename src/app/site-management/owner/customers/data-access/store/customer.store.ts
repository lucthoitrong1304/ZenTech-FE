import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, Observable, catchError, forkJoin, map, pipe, switchMap, tap } from 'rxjs';
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
import { CustomerService } from '../services/customer.service';

interface CustomerState {
  customers: CustomerSummary[];
  query: CustomerListQuery;
  totalElements: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  selectedCustomerId: string | null;
  selectedCustomer: CustomerDetail | null;
  selectedCustomerLoading: boolean;
  selectedCustomerError: string | null;
  orders: CustomerOrderHistory[];
  ordersQuery: CustomerOrderQuery;
  ordersTotalElements: number;
  ordersTotalPages: number;
  ordersLoading: boolean;
}

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

const INITIAL_STATE: CustomerState = {
  customers: [],
  query: DEFAULT_QUERY,
  totalElements: 0,
  totalPages: 0,
  loading: false,
  error: null,
  selectedCustomerId: null,
  selectedCustomer: null,
  selectedCustomerLoading: false,
  selectedCustomerError: null,
  orders: [],
  ordersQuery: DEFAULT_ORDERS_QUERY,
  ordersTotalElements: 0,
  ordersTotalPages: 0,
  ordersLoading: false,
};

export const CustomerStore = signalStore(
  withState<CustomerState>(INITIAL_STATE),
  withComputed(({ customers, loading, totalElements, selectedCustomer, orders }) => ({
    isEmpty: computed(() => !loading() && customers().length === 0),
    hasCustomers: computed(() => customers().length > 0),
    customerCountLabel: computed(() => `${totalElements()} khách hàng`),
    selectedCustomerVisible: computed(() => selectedCustomer() !== null),
    selectedCustomerAddressCount: computed(() => selectedCustomer()?.addressList.length ?? 0),
    selectedCustomerOrderCount: computed(() => orders().length),
  })),
  withMethods((store, customerService = inject(CustomerService)) => {
    const applyCustomersPage = (page: CustomerPage<CustomerSummary>): void => {
      patchState(store, {
        customers: page.content,
        query: {
          ...store.query(),
          page: page.page,
          size: page.size,
        },
        totalElements: page.totalElements,
        totalPages: page.totalPages,
        loading: false,
        error: null,
      });
    };

    const applyOrdersPage = (page: CustomerPage<CustomerOrderHistory>): void => {
      patchState(store, {
        orders: page.content,
        ordersQuery: {
          ...store.ordersQuery(),
          page: page.page,
          size: page.size,
        },
        ordersTotalElements: page.totalElements,
        ordersTotalPages: page.totalPages,
        ordersLoading: false,
      });
    };

    const loadCustomers = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() =>
          customerService.getCustomers(store.query()).pipe(
            tap({
              next: applyCustomersPage,
              error: () =>
                patchState(store, {
                  customers: [],
                  totalElements: 0,
                  totalPages: 0,
                  loading: false,
                  error: 'Không thể tải danh sách khách hàng lúc này.',
                }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadSelectedCustomer = rxMethod<string>(
      pipe(
        tap(customerId =>
          patchState(store, {
            selectedCustomerId: customerId,
            selectedCustomer: null,
            selectedCustomerLoading: true,
            selectedCustomerError: null,
            orders: [],
            ordersTotalElements: 0,
            ordersTotalPages: 0,
            ordersLoading: true,
            ordersQuery: DEFAULT_ORDERS_QUERY,
          })
        ),
        switchMap(customerId =>
          forkJoin({
            detail: customerService.getCustomerDetail(customerId),
            orders: customerService.getCustomerOrders(customerId, DEFAULT_ORDERS_QUERY),
          }).pipe(
            tap({
              next: ({ detail, orders }) => {
                patchState(store, {
                  selectedCustomer: detail,
                  selectedCustomerLoading: false,
                  selectedCustomerError: null,
                });
                applyOrdersPage(orders);
              },
              error: () =>
                patchState(store, {
                  selectedCustomer: null,
                  selectedCustomerLoading: false,
                  selectedCustomerError: 'Không thể tải hồ sơ khách hàng lúc này.',
                  orders: [],
                  ordersLoading: false,
                  ordersTotalElements: 0,
                  ordersTotalPages: 0,
                }),
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

          patchState(store, { ordersLoading: true });

          return customerService.getCustomerOrders(customerId, store.ordersQuery()).pipe(
            tap({
              next: applyOrdersPage,
              error: () =>
                patchState(store, {
                  orders: [],
                  ordersLoading: false,
                  ordersTotalElements: 0,
                  ordersTotalPages: 0,
                }),
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    return {
      loadCustomers,
      loadSelectedCustomer,
      loadOrders,
      setKeyword(keyword: string): void {
        patchState(store, {
          query: {
            ...store.query(),
            keyword,
            page: 0,
          },
        });
        loadCustomers();
      },
      setActiveFilter(activeFilter: CustomerActiveFilter): void {
        patchState(store, {
          query: {
            ...store.query(),
            activeFilter,
            page: 0,
          },
        });
        loadCustomers();
      },
      setSort(sort: CustomerSort): void {
        patchState(store, {
          query: {
            ...store.query(),
            sort,
            page: 0,
          },
        });
        loadCustomers();
      },
      setPage(page: number, size = store.query().size): void {
        patchState(store, {
          query: {
            ...store.query(),
            page,
            size,
          },
        });
        loadCustomers();
      },
      setOrdersPage(page: number, size = store.ordersQuery().size): void {
        patchState(store, {
          ordersQuery: {
            ...store.ordersQuery(),
            page,
            size,
          },
        });
        loadOrders();
      },
      closeSelectedCustomer(): void {
        patchState(store, {
          selectedCustomerId: null,
          selectedCustomer: null,
          selectedCustomerLoading: false,
          selectedCustomerError: null,
          orders: [],
          ordersTotalElements: 0,
          ordersTotalPages: 0,
          ordersLoading: false,
          ordersQuery: DEFAULT_ORDERS_QUERY,
        });
      },
      updateCustomerStatus(customerId: string, active: boolean): Observable<void> {
        return customerService.updateCustomerStatus(customerId, active).pipe(
          tap(() => {
            loadCustomers();

            if (store.selectedCustomerId() === customerId) {
              loadSelectedCustomer(customerId);
            }
          }),
          map(() => undefined)
        );
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
