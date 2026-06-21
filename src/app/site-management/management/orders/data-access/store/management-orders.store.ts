import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import { ManagementOrderEvent, ManagementOrderEventType } from '../models/management-order.event';
import {
  ManagementOrder,
  ManagementOrderDateFilter,
  ManagementOrderEditDraft,
  ManagementOrderFormErrors,
  ManagementOrderPage,
  ManagementOrderQuery,
  ManagementOrderSort,
  ManagementOrderStatusFilter,
} from '../models/management-order.models';
import { ManagementOrderService } from '../services/management-order.service';

export type ManagementOrderDrawerMode = 'detail' | 'edit' | null;

const DEFAULT_QUERY: ManagementOrderQuery = {
  page: 0,
  size: 4,
  sort: 'createdAt,desc',
  keyword: '',
  status: 'all',
  dateFilter: 'all',
};

const ORDER_ENTITY_CONFIG = {
  collection: 'order',
  selectId: (order: ManagementOrder) => order.orderId,
} as const;

interface ManagementOrdersUiState {
  query: ManagementOrderQuery;
  totalElements: number;
  totalPages: number;
  last: boolean;
  loading: boolean;
  selectedOrderId: string | null;
  selectedOrderSnapshot: ManagementOrder | null;
  drawerMode: ManagementOrderDrawerMode;
  editDraft: ManagementOrderEditDraft | null;
  editErrors: ManagementOrderFormErrors;
  saving: boolean;
  successMessage: string | null;
  errorMessage: string | null;
}

const INITIAL_STATE: ManagementOrdersUiState = {
  query: DEFAULT_QUERY,
  totalElements: 0,
  totalPages: 0,
  last: true,
  loading: false,
  selectedOrderId: null,
  selectedOrderSnapshot: null,
  drawerMode: null,
  editDraft: null,
  editErrors: {},
  saving: false,
  successMessage: null,
  errorMessage: null,
};

export const ManagementOrdersStore = signalStore(
  withState<ManagementOrdersUiState>(INITIAL_STATE),
  withEntities<ManagementOrder, 'order'>({
    entity: {} as ManagementOrder,
    collection: 'order',
  }),
  withComputed(
    ({
      orderEntities,
      query,
      totalElements,
      totalPages,
      selectedOrderId,
      selectedOrderSnapshot,
      drawerMode,
    }) => ({
      orders: computed(() => orderEntities()),
      selectedOrder: computed(() => {
        const snapshot = selectedOrderSnapshot();
        if (snapshot && snapshot.items && snapshot.items.length > 0) {
          return snapshot;
        }
        return (
          orderEntities().find(order => order.orderId === selectedOrderId()) ??
          snapshot ??
          null
        );
      }),
      detailDrawerOpen: computed(() => drawerMode() === 'detail'),
      editDrawerOpen: computed(() => drawerMode() === 'edit'),
      hasOrders: computed(() => orderEntities().length > 0),
      isEmpty: computed(() => orderEntities().length === 0),
      pageStart: computed(() => (totalElements() === 0 ? 0 : query().page * query().size + 1)),
      pageEnd: computed(() => Math.min((query().page + 1) * query().size, totalElements())),
      canGoPrevious: computed(() => query().page > 0),
      canGoNext: computed(() => query().page + 1 < totalPages()),
      activeFilterCount: computed(() => {
        let count = 0;

        if (query().keyword.trim()) {
          count += 1;
        }

        if (query().status !== 'all') {
          count += 1;
        }

        if (query().dateFilter !== 'all') {
          count += 1;
        }

        return count;
      }),
    })
  ),
  withMethods((store, orderService = inject(ManagementOrderService)) => {
    const applyOrdersPage = (page: ManagementOrderPage): void => {
      patchState(
        store,
        setAllEntities(page.orders, ORDER_ENTITY_CONFIG),
        {
          query: {
            ...store.query(),
            page: page.page,
            size: page.size,
          },
          totalElements: page.totalElements,
          totalPages: page.totalPages,
          last: page.last,
          loading: false,
          errorMessage: null,
        }
      );
    };

    const handleEvent = (event: ManagementOrderEvent): void => {
      switch (event.type) {
        case ManagementOrderEventType.OrdersLoadStarted:
          patchState(store, { loading: true, errorMessage: null });
          break;

        case ManagementOrderEventType.OrdersLoadSucceeded:
          applyOrdersPage(event.page);
          break;

        case ManagementOrderEventType.OrdersLoadFailed:
          patchState(store, {
            loading: false,
            totalElements: 0,
            totalPages: 0,
            last: true,
            errorMessage: 'Không thể tải danh sách đơn hàng. Vui lòng thử lại.',
          });
          break;

        case ManagementOrderEventType.SearchKeywordChanged:
          patchState(store, {
            query: {
              ...store.query(),
              keyword: event.keyword,
              page: 0,
            },
          });
          break;

        case ManagementOrderEventType.StatusFilterChanged:
          patchState(store, {
            query: {
              ...store.query(),
              status: event.status,
              page: 0,
            },
          });
          break;

        case ManagementOrderEventType.DateFilterChanged:
          patchState(store, {
            query: {
              ...store.query(),
              dateFilter: event.dateFilter,
              page: 0,
            },
          });
          break;

        case ManagementOrderEventType.FiltersApplied:
          patchState(store, {
            query: {
              ...store.query(),
              page: 0,
            },
          });
          break;

        case ManagementOrderEventType.FiltersReset:
          patchState(store, { query: { ...event.query } });
          break;

        case ManagementOrderEventType.PageChanged:
          patchState(store, {
            query: {
              ...store.query(),
              page: Math.max(0, Math.min(event.page, Math.max(store.totalPages() - 1, 0))),
            },
          });
          break;

        case ManagementOrderEventType.OrderSelected:
          patchState(store, {
            selectedOrderId: event.orderId,
            selectedOrderSnapshot:
              store.orderEntities().find(order => order.orderId === event.orderId) ?? null,
            drawerMode: 'detail',
            editDraft: null,
            editErrors: {},
          });
          break;

        case ManagementOrderEventType.EditClicked:
          patchState(store, {
            selectedOrderId: event.order.orderId,
            selectedOrderSnapshot: event.order,
            drawerMode: 'edit',
            editDraft: event.draft,
            editErrors: {},
          });
          break;

        case ManagementOrderEventType.DrawerClosed:
        case ManagementOrderEventType.EditCancelled:
          patchState(store, {
            drawerMode: null,
            selectedOrderId: null,
            selectedOrderSnapshot: null,
            editDraft: null,
            editErrors: {},
            saving: false,
          });
          break;

        case ManagementOrderEventType.EditDraftChanged: {
          const currentDraft = store.editDraft();

          patchState(store, {
            editDraft: currentDraft
              ? {
                  ...currentDraft,
                  ...event.patch,
                }
              : null,
            editErrors: {},
          });
          break;
        }

        case ManagementOrderEventType.EditQuantityChanged: {
          const currentDraft = store.editDraft();

          patchState(store, {
            editDraft: currentDraft
              ? {
                  ...currentDraft,
                  items: currentDraft.items.map(item =>
                    item.orderItemId === event.orderItemId
                      ? { ...item, quantity: Math.max(1, event.quantity) }
                      : item
                  ),
                }
              : null,
            editErrors: {},
          });
          break;
        }

        case ManagementOrderEventType.EditSubmitted:
          patchState(store, { saving: true, editErrors: {}, errorMessage: null });
          break;

        case ManagementOrderEventType.EditValidationFailed:
          patchState(store, { saving: false, editErrors: event.errors });
          break;

        case ManagementOrderEventType.EditSucceeded:
        case ManagementOrderEventType.DeliveryMarked:
          patchState(
            store,
            updateEntity(
              {
                id: event.order.orderId,
                changes: event.order,
              },
              ORDER_ENTITY_CONFIG
            ),
            {
              saving: false,
              drawerMode: null,
              selectedOrderId: null,
              selectedOrderSnapshot: null,
              editDraft: null,
              editErrors: {},
              successMessage:
                event.type === ManagementOrderEventType.DeliveryMarked
                  ? 'Đã đánh dấu đơn hàng là đã giao.'
                  : 'Đã lưu thay đổi đơn hàng.',
            }
          );
          break;

        case ManagementOrderEventType.EditFailed:
          patchState(store, {
            saving: false,
            editErrors: { submit: 'Không thể lưu thay đổi đơn hàng lúc này.' },
            errorMessage: 'Không thể lưu thay đổi đơn hàng lúc này.',
          });
          break;

        case ManagementOrderEventType.MessagesCleared:
          patchState(store, { successMessage: null, errorMessage: null });
          break;
      }
    };

    const loadOrders = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: ManagementOrderEventType.OrdersLoadStarted })),
        switchMap(() =>
          orderService.getOrders(store.query()).pipe(
            tap({
              next: page => handleEvent({ type: ManagementOrderEventType.OrdersLoadSucceeded, page }),
              error: () => handleEvent({ type: ManagementOrderEventType.OrdersLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadOrderDetail = rxMethod<string>(
      pipe(
        tap(() => patchState(store, { loading: true, errorMessage: null })),
        switchMap(orderId =>
          orderService.getOrderDetail(orderId).pipe(
            tap({
              next: order => {
                patchState(store, {
                  selectedOrderSnapshot: order,
                  editDraft: store.drawerMode() === 'edit' ? toEditDraft(order) : null,
                  loading: false,
                });
              },
              error: () => {
                patchState(store, {
                  loading: false,
                  errorMessage: 'Không thể tải chi tiết đơn hàng.',
                });
              },
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const saveEditDraft = rxMethod<void>(
      pipe(
        switchMap(() => {
          const draft = store.editDraft();

          if (!draft) {
            return EMPTY;
          }

          const errors = validateEditDraft(draft);

          if (Object.keys(errors).length > 0) {
            handleEvent({ type: ManagementOrderEventType.EditValidationFailed, errors });
            return EMPTY;
          }

          handleEvent({ type: ManagementOrderEventType.EditSubmitted });

          return orderService.updateOrder(draft).pipe(
            tap({
              next: order => handleEvent({ type: ManagementOrderEventType.EditSucceeded, order }),
              error: () => handleEvent({ type: ManagementOrderEventType.EditFailed }),
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    const markDelivered = rxMethod<string>(
      pipe(
        switchMap(orderId =>
          orderService.markDelivered(orderId).pipe(
            tap({
              next: order => handleEvent({ type: ManagementOrderEventType.DeliveryMarked, order }),
              error: () => handleEvent({ type: ManagementOrderEventType.EditFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    return {
      dispatch: handleEvent,
      loadOrders,
      saveEditDraft,
      markDelivered,
      setKeyword(keyword: string): void {
        handleEvent({ type: ManagementOrderEventType.SearchKeywordChanged, keyword });
      },
      setStatusFilter(status: ManagementOrderStatusFilter): void {
        handleEvent({ type: ManagementOrderEventType.StatusFilterChanged, status });
      },
      setDateFilter(dateFilter: ManagementOrderDateFilter): void {
        handleEvent({ type: ManagementOrderEventType.DateFilterChanged, dateFilter });
      },
      setSort(sort: ManagementOrderSort): void {
        patchState(store, {
          query: {
            ...store.query(),
            sort,
            page: 0,
          },
        });
      },
      applyFilters(): void {
        handleEvent({ type: ManagementOrderEventType.FiltersApplied });
        loadOrders();
      },
      resetFilters(): void {
        handleEvent({ type: ManagementOrderEventType.FiltersReset, query: DEFAULT_QUERY });
        loadOrders();
      },
      goToPage(page: number): void {
        handleEvent({ type: ManagementOrderEventType.PageChanged, page });
        loadOrders();
      },
      openDetail(orderId: string): void {
        handleEvent({ type: ManagementOrderEventType.OrderSelected, orderId });
        loadOrderDetail(orderId);
      },
      openEdit(order: ManagementOrder): void {
        handleEvent({
          type: ManagementOrderEventType.EditClicked,
          order,
          draft: null,
        });
        loadOrderDetail(order.orderId);
      },
      updateEditDraft(patch: Partial<ManagementOrderEditDraft>): void {
        handleEvent({ type: ManagementOrderEventType.EditDraftChanged, patch });
      },
      updateEditQuantity(orderItemId: string, quantity: number): void {
        handleEvent({ type: ManagementOrderEventType.EditQuantityChanged, orderItemId, quantity });
      },
      cancelEdit(): void {
        handleEvent({ type: ManagementOrderEventType.EditCancelled });
      },
      closeDrawer(): void {
        handleEvent({ type: ManagementOrderEventType.DrawerClosed });
      },
      clearMessages(): void {
        handleEvent({ type: ManagementOrderEventType.MessagesCleared });
      },
    };
  })
);

function toEditDraft(order: ManagementOrder): ManagementOrderEditDraft {
  return {
    orderId: order.orderId,
    customerName: order.customer.fullName,
    shippingAddress: order.customer.shippingAddress,
    orderStatus: order.orderStatus,
    items: order.items.map(item => ({
      orderItemId: item.orderItemId,
      quantity: item.quantity,
    })),
  };
}

function validateEditDraft(draft: ManagementOrderEditDraft): ManagementOrderFormErrors {
  const errors: ManagementOrderFormErrors = {};

  if (!draft.customerName.trim()) {
    errors.customerName = 'Vui lòng nhập tên khách hàng.';
  }

  if (!draft.shippingAddress.trim()) {
    errors.shippingAddress = 'Vui lòng nhập địa chỉ giao hàng.';
  }

  if (draft.items.some(item => item.quantity < 1)) {
    errors.items = 'Số lượng sản phẩm phải lớn hơn 0.';
  }

  return errors;
}
