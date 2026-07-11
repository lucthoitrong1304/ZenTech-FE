import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, exhaustMap, forkJoin, pipe, switchMap, tap } from 'rxjs';
import { ToastService } from '@/shared/components/toast/toast.service';
import {
  LeaveQuota,
  LeaveSettingsEmployee,
  LeaveType,
  LeaveTypePayload,
} from '@/site-management/management/leave-settings/data-access/models/leave-settings.models';
import { LeaveSettingsService } from '@/site-management/management/leave-settings/data-access/services/leave-settings.service';

interface State {
  leaveTypes: LeaveType[];
  employees: LeaveSettingsEmployee[];
  quotas: LeaveQuota[];
  loading: boolean;
  savingType: boolean;
  savingQuotas: boolean;
}
const initialState: State = {
  leaveTypes: [],
  employees: [],
  quotas: [],
  loading: false,
  savingType: false,
  savingQuotas: false,
};

export const LeaveSettingsStore = signalStore(
  withState(initialState),
  withMethods((store, service = inject(LeaveSettingsService), toast = inject(ToastService)) => {
    const loadInitial = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() =>
          forkJoin({ types: service.getTypes(), employees: service.getEmployees() }).pipe(
            tap({
              next: (result) => {
                patchState(store, {
                  loading: false,
                  leaveTypes: result.types.success ? result.types.data : [],
                  employees: result.employees.success ? result.employees.data.content : [],
                });
                if (!result.types.success || !result.employees.success)
                  toast.error('Không thể tải cấu hình nghỉ phép.');
              },
              error: () => {
                patchState(store, { loading: false });
                toast.error('Không thể tải cấu hình nghỉ phép.');
              },
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const loadQuotas = rxMethod<{ employeeId: string; year: number }>(
      pipe(
        switchMap((query) =>
          service.getQuotas(query.employeeId, query.year).pipe(
            tap({
              next: (response) => {
                if (response.success) patchState(store, { quotas: response.data });
                else toast.error(response.message || 'Không thể tải hạn mức.');
              },
              error: () => toast.error('Không thể tải hạn mức.'),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const saveType = rxMethod<{
      id: string | null;
      payload: LeaveTypePayload;
      quotaQuery: { employeeId: string; year: number } | null;
    }>(
      pipe(
        tap(() => patchState(store, { savingType: true })),
        exhaustMap((input) =>
          service.saveType(input.payload, input.id).pipe(
            tap({
              next: (response) => {
                patchState(store, { savingType: false });
                if (response.success) {
                  toast.success('Đã lưu loại phép.');
                  loadInitial();
                  if (input.quotaQuery) loadQuotas(input.quotaQuery);
                } else toast.error(response.message || 'Lưu loại phép thất bại.');
              },
              error: () => {
                patchState(store, { savingType: false });
                toast.error('Lưu loại phép thất bại.');
              },
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    const saveQuotas = rxMethod<{
      employeeId: string;
      year: number;
      quotas: { leaveTypeId: string; entitlement: number }[];
    }>(
      pipe(
        tap(() => patchState(store, { savingQuotas: true })),
        exhaustMap((input) =>
          service.saveQuotas(input.employeeId, input.year, input.quotas).pipe(
            tap({
              next: (response) => {
                patchState(store, { savingQuotas: false });
                if (response.success) {
                  patchState(store, { quotas: response.data });
                  toast.success('Đã lưu hạn mức.');
                } else toast.error(response.message || 'Lưu hạn mức thất bại.');
              },
              error: () => {
                patchState(store, { savingQuotas: false });
                toast.error('Lưu hạn mức thất bại.');
              },
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );
    return { loadInitial, loadQuotas, saveType, saveQuotas };
  }),
);
