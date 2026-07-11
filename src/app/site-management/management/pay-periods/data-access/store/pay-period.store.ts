import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, exhaustMap, pipe, switchMap, tap } from 'rxjs';
import { ToastService } from '@/shared/components/toast/toast.service';
import { CreatePayPeriodPayload, PayPeriod } from '@/site-management/management/pay-periods/data-access/models/pay-period.models';
import { PayPeriodService } from '@/site-management/management/pay-periods/data-access/services/pay-period.service';

interface PayPeriodState {
  periods: PayPeriod[];
  loading: boolean;
  submittingId: string | null;
}

const initialState: PayPeriodState = { periods: [], loading: false, submittingId: null };

export const PayPeriodStore = signalStore(
  withState(initialState),
  withMethods((store, service = inject(PayPeriodService), toast = inject(ToastService)) => {
    const load = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() =>
          service.getPeriods().pipe(
            tap({
              next: (response) => {
                if (response.success) patchState(store, { periods: response.data, loading: false });
                else {
                  patchState(store, { loading: false });
                  toast.error(response.message || 'Không thể tải danh sách kỳ công.');
                }
              },
              error: (error: { error?: { message?: string } }) => {
                patchState(store, { loading: false });
                toast.error(error.error?.message || 'Không thể tải danh sách kỳ công.');
              },
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const create = rxMethod<CreatePayPeriodPayload>(
      pipe(
        exhaustMap((payload) => service.createPeriod(payload).pipe(
          tap({
            next: (response) => {
              if (response.success) { toast.success('Tạo kỳ công thành công.'); load(); }
              else toast.error(response.message || 'Không thể tạo kỳ công.');
            },
            error: (error: { error?: { message?: string } }) =>
              toast.error(error.error?.message || 'Không thể tạo kỳ công.'),
          }),
          catchError(() => EMPTY),
        )),
      ),
    );
    const setLocked = rxMethod<PayPeriod>(
      pipe(
        tap((period) => patchState(store, { submittingId: period.id })),
        exhaustMap((period) => service.setLocked(period.id, !period.locked).pipe(
          tap({
            next: (response) => {
              patchState(store, { submittingId: null });
              if (response.success) { toast.success(period.locked ? 'Đã mở khóa kỳ công.' : 'Đã khóa kỳ công.'); load(); }
              else toast.error(response.message || 'Thao tác thất bại.');
            },
            error: (error: { error?: { message?: string } }) => {
              patchState(store, { submittingId: null });
              toast.error(error.error?.message || 'Thao tác thất bại.');
            },
          }),
          catchError(() => EMPTY),
        )),
      ),
    );
    return { load, create, setLocked };
  }),
);
