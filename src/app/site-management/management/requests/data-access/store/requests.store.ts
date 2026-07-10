import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, exhaustMap, pipe, switchMap, tap } from 'rxjs';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import {
  AttendanceAdjustment,
  CreateAttendanceAdjustment,
  CreateLeaveRequest,
  CreateSwapRequest,
  EmployeeDirectoryEntry,
  LeaveQuota,
  LeaveRequest,
  LeaveType,
  RequestsError,
  RequestsMutation,
  ShiftDto,
  ShiftSwapRequest,
} from '../models/requests.models';
import { RequestsService } from '../services/requests.service';

interface RequestsState {
  loadingInitial: boolean;
  loadingDailyShifts: boolean;
  loadingSwapShifts: boolean;
  loadingColleagueShifts: boolean;
  submitting: boolean;
  error: RequestsError | null;
  lastSuccess: RequestsMutation | null;
  leaveTypes: LeaveType[];
  quotas: LeaveQuota[];
  myDailyShifts: ShiftDto[];
  mySwapShifts: ShiftDto[];
  colleagueShifts: ShiftDto[];
  colleagues: EmployeeDirectoryEntry[];
}

const initialState: RequestsState = {
  loadingInitial: false,
  loadingDailyShifts: false,
  loadingSwapShifts: false,
  loadingColleagueShifts: false,
  submitting: false,
  error: null,
  lastSuccess: null,
  leaveTypes: [],
  quotas: [],
  myDailyShifts: [],
  mySwapShifts: [],
  colleagueShifts: [],
  colleagues: [],
};

export const RequestsStore = signalStore(
  withState(initialState),
  withEntities<LeaveRequest, 'leave'>({ entity: {} as LeaveRequest, collection: 'leave' }),
  withEntities<ShiftSwapRequest, 'swap'>({ entity: {} as ShiftSwapRequest, collection: 'swap' }),
  withEntities<AttendanceAdjustment, 'adjustment'>({
    entity: {} as AttendanceAdjustment,
    collection: 'adjustment',
  }),
  withComputed(({ leaveEntities, swapEntities, adjustmentEntities }) => ({
    myLeaves: computed(() => leaveEntities()),
    mySwaps: computed(() => swapEntities()),
    myAdjustments: computed(() => adjustmentEntities()),
  })),
  withMethods((store, service = inject(RequestsService), toast = inject(ToastService)) => {
    const fail = (operation: string, error: unknown, fallback: string) => {
      const responseMessage =
        typeof error === 'object' &&
        error &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : null;
      const httpMessage =
        typeof error === 'object' &&
        error &&
        'error' in error &&
        typeof (error as { error?: { message?: unknown } }).error?.message === 'string'
          ? (error as { error: { message: string } }).error.message
          : null;
      const message = httpMessage ?? responseMessage ?? fallback;
      patchState(store, {
        loadingInitial: false,
        loadingDailyShifts: false,
        loadingSwapShifts: false,
        loadingColleagueShifts: false,
        submitting: false,
        error: { operation, message },
      });
      toast.error(message);
    };

    const loadLeaveTypes = rxMethod<void>(
      pipe(
        switchMap(() =>
          service.getLeaveTypes().pipe(
            tap({
              next: (response) => {
                if (response.success) patchState(store, { leaveTypes: response.data });
                else fail('load-leave-types', response, 'Không tải được danh sách loại phép.');
              },
              error: (error) =>
                fail('load-leave-types', error, 'Không tải được danh sách loại phép.'),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const loadQuotas = rxMethod<void>(
      pipe(
        switchMap(() =>
          service.getMyQuotas().pipe(
            tap({
              next: (r) =>
                r.success
                  ? patchState(store, { quotas: r.data })
                  : fail('load-quotas', r, 'Không tải được hạn mức phép.'),
              error: (e) => fail('load-quotas', e, 'Không tải được hạn mức phép.'),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const loadLeaves = rxMethod<void>(
      pipe(
        switchMap(() =>
          service.getMyLeaves().pipe(
            tap({
              next: (r) =>
                r.success
                  ? patchState(store, setAllEntities(r.data, { collection: 'leave' }))
                  : fail('load-leaves', r, 'Không tải được lịch sử nghỉ phép.'),
              error: (e) => fail('load-leaves', e, 'Không tải được lịch sử nghỉ phép.'),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const loadSwaps = rxMethod<void>(
      pipe(
        switchMap(() =>
          service.getMySwaps().pipe(
            tap({
              next: (r) =>
                r.success
                  ? patchState(store, setAllEntities(r.data, { collection: 'swap' }))
                  : fail('load-swaps', r, 'Không tải được lịch sử đổi ca.'),
              error: (e) => fail('load-swaps', e, 'Không tải được lịch sử đổi ca.'),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const loadAdjustments = rxMethod<void>(
      pipe(
        switchMap(() =>
          service.getMyAdjustments().pipe(
            tap({
              next: (r) =>
                r.success
                  ? patchState(store, setAllEntities(r.data, { collection: 'adjustment' }))
                  : fail('load-adjustments', r, 'Không tải được lịch sử điều chỉnh công.'),
              error: (e) => fail('load-adjustments', e, 'Không tải được lịch sử điều chỉnh công.'),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const loadDailyShifts = rxMethod<string>(
      pipe(
        tap(() => patchState(store, { loadingDailyShifts: true, error: null })),
        switchMap((date) =>
          service.getMyShifts(date).pipe(
            tap({
              next: (r) =>
                r.success
                  ? patchState(store, { myDailyShifts: r.data, loadingDailyShifts: false })
                  : fail('load-daily-shifts', r, 'Không tải được ca làm việc.'),
              error: (e) => fail('load-daily-shifts', e, 'Không tải được ca làm việc.'),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const loadSwapShifts = rxMethod<string>(
      pipe(
        tap(() => patchState(store, { loadingSwapShifts: true, error: null })),
        switchMap((date) =>
          service.getMyShifts(date).pipe(
            tap({
              next: (r) =>
                r.success
                  ? patchState(store, { mySwapShifts: r.data, loadingSwapShifts: false })
                  : fail('load-swap-shifts', r, 'Không tải được ca làm việc.'),
              error: (e) => fail('load-swap-shifts', e, 'Không tải được ca làm việc.'),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const loadColleagues = rxMethod<void>(
      pipe(
        switchMap(() =>
          service.getColleagues().pipe(
            tap({
              next: (r) =>
                r.success
                  ? patchState(store, { colleagues: r.data.content })
                  : fail('load-colleagues', r, 'Không tải được danh sách đồng nghiệp.'),
              error: (e) => fail('load-colleagues', e, 'Không tải được danh sách đồng nghiệp.'),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const loadColleagueShifts = rxMethod<{ employeeId: string; date: string }>(
      pipe(
        tap(() => patchState(store, { loadingColleagueShifts: true, error: null })),
        switchMap(({ employeeId, date }) =>
          service.getColleagueShifts(employeeId, date).pipe(
            tap({
              next: (r) =>
                r.success
                  ? patchState(store, {
                      colleagueShifts:
                        r.data.employees?.content?.find(
                          (employee) => employee.employeeId === employeeId,
                        )?.shifts ?? [],
                      loadingColleagueShifts: false,
                    })
                  : fail('load-colleague-shifts', r, 'Không tải được ca của đồng nghiệp.'),
              error: (e) => fail('load-colleague-shifts', e, 'Không tải được ca của đồng nghiệp.'),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const refreshLeaves = (date?: string) => {
      loadLeaves();
      loadQuotas();
      if (date) loadDailyShifts(date);
    };
    const submitLeave = rxMethod<{ payload: CreateLeaveRequest; date?: string }>(
      pipe(
        tap(() => patchState(store, { submitting: true, error: null })),
        exhaustMap(({ payload, date }) =>
          service.createLeave(payload).pipe(
            tap({
              next: (r) => {
                if (r.success) {
                  patchState(store, { submitting: false, lastSuccess: 'leave' });
                  toast.success('Đã gửi yêu cầu nghỉ.');
                  refreshLeaves(date);
                } else fail('submit-leave', r, 'Gửi yêu cầu thất bại.');
              },
              error: (e) => fail('submit-leave', e, 'Gửi yêu cầu thất bại.'),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const submitSwap = rxMethod<CreateSwapRequest>(
      pipe(
        tap(() => patchState(store, { submitting: true, error: null })),
        exhaustMap((payload) =>
          service.createSwap(payload).pipe(
            tap({
              next: (r) => {
                if (r.success) {
                  patchState(store, { submitting: false, lastSuccess: 'swap' });
                  toast.success('Đã gửi yêu cầu đổi ca.');
                  loadSwaps();
                } else fail('submit-swap', r, 'Gửi yêu cầu đổi ca thất bại.');
              },
              error: (e) => fail('submit-swap', e, 'Gửi yêu cầu đổi ca thất bại.'),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const submitAdjustment = rxMethod<CreateAttendanceAdjustment>(
      pipe(
        tap(() => patchState(store, { submitting: true, error: null })),
        exhaustMap((payload) =>
          service.createAdjustment(payload).pipe(
            tap({
              next: (r) => {
                if (r.success) {
                  patchState(store, { submitting: false, lastSuccess: 'adjustment' });
                  toast.success('Đã gửi yêu cầu điều chỉnh công.');
                  loadAdjustments();
                } else fail('submit-adjustment', r, 'Gửi yêu cầu điều chỉnh công thất bại.');
              },
              error: (e) => fail('submit-adjustment', e, 'Gửi yêu cầu điều chỉnh công thất bại.'),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const cancelLeave = rxMethod<{ id: string; date?: string }>(
      pipe(
        exhaustMap(({ id, date }) =>
          service.cancelLeave(id).pipe(
            tap({
              next: (r) =>
                r.success
                  ? (patchState(store, { lastSuccess: 'cancel-leave' }),
                    toast.success('Đã gửi yêu cầu hủy.'),
                    refreshLeaves(date))
                  : fail('cancel-leave', r, 'Hủy yêu cầu thất bại.'),
              error: (e) => fail('cancel-leave', e, 'Hủy yêu cầu thất bại.'),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const cancelSwap = rxMethod<string>(
      pipe(
        exhaustMap((id) =>
          service.cancelSwap(id).pipe(
            tap({
              next: (r) =>
                r.success
                  ? (patchState(store, { lastSuccess: 'cancel-swap' }),
                    toast.success('Đã gửi yêu cầu hủy.'),
                    loadSwaps())
                  : fail('cancel-swap', r, 'Hủy yêu cầu thất bại.'),
              error: (e) => fail('cancel-swap', e, 'Hủy yêu cầu thất bại.'),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const cancelAdjustment = rxMethod<string>(
      pipe(
        exhaustMap((id) =>
          service.cancelAdjustment(id).pipe(
            tap({
              next: (r) =>
                r.success
                  ? (patchState(store, { lastSuccess: 'cancel-adjustment' }),
                    toast.success('Đã gửi yêu cầu hủy.'),
                    loadAdjustments())
                  : fail('cancel-adjustment', r, 'Hủy yêu cầu thất bại.'),
              error: (e) => fail('cancel-adjustment', e, 'Hủy yêu cầu thất bại.'),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    return {
      loadInitialData: () => {
        patchState(store, { loadingInitial: true, error: null });
        loadLeaveTypes();
        loadQuotas();
        loadLeaves();
        loadSwaps();
        loadAdjustments();
        loadColleagues();
        patchState(store, { loadingInitial: false });
      },
      loadDailyShifts,
      loadSwapShifts,
      loadColleagueShifts,
      submitLeave,
      submitSwap,
      submitAdjustment,
      cancelLeave,
      cancelSwap,
      cancelAdjustment,
      clearDailyShifts: () => patchState(store, { myDailyShifts: [] }),
      clearSwapShifts: () => patchState(store, { mySwapShifts: [] }),
      clearColleagueShifts: () => patchState(store, { colleagueShifts: [] }),
      clearError: () => patchState(store, { error: null }),
      clearSuccess: () => patchState(store, { lastSuccess: null }),
    };
  }),
);
