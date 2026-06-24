import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import { ReturnRequest, ReturnRequestStatus } from '../models/return-request.model';
import { ReturnRequestService } from '../services/return-request.service';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

const REQUEST_ENTITY_CONFIG = {
  collection: 'request',
} as const;

interface ReturnRequestUiState {
  loading: boolean;
  saving: boolean;
  selectedRequestId: string | null;
  successMessage: string | null;
  errorMessage: string | null;
  searchKeyword: string;
  statusFilter: 'ALL' | ReturnRequestStatus;
  dateFilter: 'ALL' | 'TODAY' | 'LAST7DAYS' | 'LAST30DAYS' | 'CUSTOM';
  sortOrder: 'NEWEST' | 'OLDEST';
  startDate: string | null;
  endDate: string | null;
  page: number;
  pageSize: number;
}

const INITIAL_STATE: ReturnRequestUiState = {
  loading: false,
  saving: false,
  selectedRequestId: null,
  successMessage: null,
  errorMessage: null,
  searchKeyword: '',
  statusFilter: 'ALL',
  dateFilter: 'ALL',
  sortOrder: 'NEWEST',
  startDate: null,
  endDate: null,
  page: 0,
  pageSize: 10,
};

export const ReturnRequestStore = signalStore(
  { providedIn: 'root' },
  withState<ReturnRequestUiState>(INITIAL_STATE),
  withEntities<ReturnRequest, 'request'>({
    entity: {} as ReturnRequest,
    collection: 'request',
  }),
  withComputed(({ requestEntities, selectedRequestId, searchKeyword, statusFilter, dateFilter, sortOrder, startDate, endDate, page, pageSize }) => {
    const requests = computed(() => {
      let list = requestEntities();

      // 1. Lọc theo từ khóa tìm kiếm
      const keyword = searchKeyword().toLowerCase().trim();
      if (keyword) {
        list = list.filter(
          req =>
            req.orderId.toLowerCase().includes(keyword) ||
            req.customerName.toLowerCase().includes(keyword) ||
            req.reason.toLowerCase().includes(keyword)
        );
      }

      // 2. Lọc theo trạng thái
      const status = statusFilter();
      if (status !== 'ALL') {
        list = list.filter(req => req.status === status);
      }

      // 3. Lọc theo thời gian
      const dateRange = dateFilter();
      if (dateRange !== 'ALL') {
        if (dateRange === 'CUSTOM') {
          const start = startDate();
          const end = endDate();
          list = list.filter(req => {
            const reqTime = new Date(req.createdAt).getTime();
            if (start) {
              const startTime = new Date(start + 'T00:00:00').getTime();
              if (reqTime < startTime) return false;
            }
            if (end) {
              const endTime = new Date(end + 'T23:59:59').getTime();
              if (reqTime > endTime) return false;
            }
            return true;
          });
        } else {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          list = list.filter(req => {
            const reqDate = new Date(req.createdAt).getTime();
            if (dateRange === 'TODAY') {
              return reqDate >= todayStart;
            } else if (dateRange === 'LAST7DAYS') {
              const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
              return reqDate >= sevenDaysAgo;
            } else if (dateRange === 'LAST30DAYS') {
              const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;
              return reqDate >= thirtyDaysAgo;
            }
            return true;
          });
        }
      }

      // 4. Sắp xếp
      const sort = sortOrder();
      list = [...list].sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sort === 'NEWEST' ? timeB - timeA : timeA - timeB;
      });

      return list;
    });

    const paginatedRequests = computed(() => {
      const list = requests();
      const start = page() * pageSize();
      const end = start + pageSize();
      return list.slice(start, end);
    });

    const totalElements = computed(() => requests().length);

    const selectedRequest = computed(() => {
      const id = selectedRequestId();
      return requestEntities().find(req => req.id === id) ?? null;
    });

    return {
      requests,
      paginatedRequests,
      totalElements,
      selectedRequest,
    };
  }),
  withMethods((store, returnRequestService = inject(ReturnRequestService), toastService = inject(ToastService)) => {
    
    const loadRequests = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, errorMessage: null })),
        switchMap(() =>
          returnRequestService.getReturnRequests().pipe(
            tap({
              next: res => {
                if (res.success) {
                  patchState(store, setAllEntities(res.data, REQUEST_ENTITY_CONFIG), {
                    loading: false,
                  });
                } else {
                  patchState(store, { loading: false, errorMessage: res.message });
                  toastService.error(res.message || 'Lỗi tải danh sách yêu cầu trả hàng');
                }
              },
              error: err => {
                patchState(store, { loading: false, errorMessage: err.message });
                toastService.error(err.message || 'Lỗi tải danh sách yêu cầu trả hàng');
              },
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const approveRequest = rxMethod<{ id: string; resellable: boolean }>(
      pipe(
        tap(() => patchState(store, { saving: true, errorMessage: null })),
        switchMap(({ id, resellable }) =>
          returnRequestService.approveRequest(id, resellable).pipe(
            tap({
              next: res => {
                if (res.success) {
                  patchState(store, updateEntity({ id, changes: res.data }, REQUEST_ENTITY_CONFIG), {
                    saving: false,
                    successMessage: 'Phê duyệt yêu cầu trả hàng thành công',
                  });
                  toastService.success('Đã phê duyệt yêu cầu trả hàng');
                  loadRequests();
                } else {
                  patchState(store, { saving: false, errorMessage: res.message });
                  toastService.error(res.message || 'Lỗi phê duyệt yêu cầu');
                }
              },
              error: err => {
                patchState(store, { saving: false, errorMessage: err.message });
                toastService.error(err.message || 'Lỗi phê duyệt yêu cầu');
              },
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const rejectRequest = rxMethod<string>(
      pipe(
        tap(() => patchState(store, { saving: true, errorMessage: null })),
        switchMap(id =>
          returnRequestService.rejectRequest(id).pipe(
            tap({
              next: res => {
                if (res.success) {
                  patchState(store, updateEntity({ id, changes: res.data }, REQUEST_ENTITY_CONFIG), {
                    saving: false,
                    successMessage: 'Từ chối yêu cầu trả hàng thành công',
                  });
                  toastService.success('Đã từ chối yêu cầu trả hàng');
                  loadRequests();
                } else {
                  patchState(store, { saving: false, errorMessage: res.message });
                  toastService.error(res.message || 'Lỗi từ chối yêu cầu');
                }
              },
              error: err => {
                patchState(store, { saving: false, errorMessage: err.message });
                toastService.error(err.message || 'Lỗi từ chối yêu cầu');
              },
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    return {
      loadRequests,
      approveRequest,
      rejectRequest,
      selectRequestId(id: string | null) {
        patchState(store, { selectedRequestId: id });
      },
      setSearchKeyword(keyword: string) {
        patchState(store, { searchKeyword: keyword, page: 0 });
      },
      setStatusFilter(status: 'ALL' | ReturnRequestStatus) {
        patchState(store, { statusFilter: status, page: 0 });
      },
      setDateFilter(dateRange: 'ALL' | 'TODAY' | 'LAST7DAYS' | 'LAST30DAYS' | 'CUSTOM') {
        patchState(store, { dateFilter: dateRange, page: 0 });
      },
      setStartDate(date: string | null) {
        patchState(store, { startDate: date, page: 0 });
      },
      setEndDate(date: string | null) {
        patchState(store, { endDate: date, page: 0 });
      },
      setSortOrder(sort: 'NEWEST' | 'OLDEST') {
        patchState(store, { sortOrder: sort, page: 0 });
      },
      goToPage(page: number) {
        patchState(store, { page });
      },
      setPageSize(pageSize: number) {
        patchState(store, { pageSize, page: 0 });
      },
      resetFilters() {
        patchState(store, {
          searchKeyword: '',
          statusFilter: 'ALL',
          dateFilter: 'ALL',
          sortOrder: 'NEWEST',
          startDate: null,
          endDate: null,
          page: 0,
        });
      },
    };
  })
);
