import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import { ReturnRequest } from '../models/return-request.model';
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
}

const INITIAL_STATE: ReturnRequestUiState = {
  loading: false,
  saving: false,
  selectedRequestId: null,
  successMessage: null,
  errorMessage: null,
};

export const ReturnRequestStore = signalStore(
  { providedIn: 'root' },
  withState<ReturnRequestUiState>(INITIAL_STATE),
  withEntities<ReturnRequest, 'request'>({
    entity: {} as ReturnRequest,
    collection: 'request',
  }),
  withComputed(({ requestEntities, selectedRequestId }) => ({
    requests: computed(() => requestEntities()),
    selectedRequest: computed(() => {
      const id = selectedRequestId();
      return requestEntities().find(req => req.id === id) ?? null;
    }),
  })),
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
    };
  })
);
