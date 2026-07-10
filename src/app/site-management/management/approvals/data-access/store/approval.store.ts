import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, Observable, catchError, exhaustMap, forkJoin, pipe, switchMap, tap } from 'rxjs';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { ApprovalDecision, ApprovalResponse, AttendanceAdjustmentApproval, LeaveRequestApproval, ShiftSwapApproval } from '../models/approval.models';
import { ApprovalService } from '../services/approval.service';

interface ApprovalState {
  leaves: LeaveRequestApproval[];
  swaps: ShiftSwapApproval[];
  adjustments: AttendanceAdjustmentApproval[];
  loading: boolean;
  submittingId: string | null;
}

const initialState: ApprovalState = { leaves: [], swaps: [], adjustments: [], loading: false, submittingId: null };

export const ApprovalStore = signalStore(
  withState(initialState),
  withMethods((store, service = inject(ApprovalService), toast = inject(ToastService)) => {
    const load = rxMethod<void>(pipe(
      tap(() => patchState(store, { loading: true })),
      switchMap(() => forkJoin({ leaves: service.getPendingLeaves(), swaps: service.getPendingSwaps(), adjustments: service.getPendingAdjustments() }).pipe(
        tap({
          next: (response) => {
            patchState(store, { loading: false });
            if (response.leaves.success && response.swaps.success && response.adjustments.success) {
              patchState(store, { leaves: response.leaves.data, swaps: response.swaps.data, adjustments: response.adjustments.data });
            } else toast.error('Không thể tải đầy đủ danh sách chờ duyệt.');
          },
          error: () => { patchState(store, { loading: false }); toast.error('Không thể tải danh sách chờ duyệt.'); },
        }),
        catchError(() => EMPTY),
      )),
    ));
    const decide = <T>(request: (id: string, status: ApprovalDecision) => Observable<ApprovalResponse<T>>, refresh: () => void, success: (status: ApprovalDecision) => string, failure: string) => rxMethod<{ id: string; status: ApprovalDecision }>(pipe(
      tap(({ id }) => patchState(store, { submittingId: id })),
      exhaustMap(({ id, status }) => request(id, status).pipe(
        tap({
          next: (response) => { patchState(store, { submittingId: null }); if (response.success) { toast.success(success(status)); refresh(); } else toast.error(response.message || failure); },
          error: () => { patchState(store, { submittingId: null }); toast.error(failure); },
        }),
        catchError(() => EMPTY),
      )),
    ));
    return {
      load,
      decideLeave: decide(service.decideLeave.bind(service), () => load(), status => status === 'APPROVED' ? 'Đã phê duyệt yêu cầu.' : 'Đã từ chối yêu cầu.', 'Cập nhật yêu cầu thất bại.'),
      decideSwap: decide(service.decideSwap.bind(service), () => load(), status => status === 'APPROVED' ? 'Đã duyệt đổi ca.' : 'Đã từ chối đổi ca.', 'Duyệt đổi ca thất bại.'),
      decideAdjustment: decide(service.decideAdjustment.bind(service), () => load(), status => status === 'APPROVED' ? 'Đã duyệt chỉnh công.' : 'Đã từ chối chỉnh công.', 'Duyệt chỉnh công thất bại.'),
    };
  }),
);
