import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import { AdminDashboardService } from './dashboard.service';
import {
  AdminDashboardData,
  AdminResourceMetrics,
  DashboardPeriod,
} from './dashboard.models';

interface DashboardState {
  period: DashboardPeriod;
  customFrom: string | null;
  customTo: string | null;
  data: AdminDashboardData | null;
  resources: AdminResourceMetrics | null;
  isLoading: boolean;
  isRefreshingResources: boolean;
  error: string | null;
  resourceError: string | null;
}

const initialState: DashboardState = {
  period: 'TODAY',
  customFrom: null,
  customTo: null,
  data: null,
  resources: null,
  isLoading: false,
  isRefreshingResources: false,
  error: null,
  resourceError: null,
};

export const AdminDashboardStore = signalStore(
  withState(initialState),
  withComputed(({ data }) => ({
    health: computed(() => data()?.health ?? 'HEALTHY'),
    metrics: computed(() => data()?.metrics ?? null),
    generatedAt: computed(() => data()?.generatedAt ?? null),
    topIssues: computed(() => data()?.topIssues ?? []),
    priorityIncidents: computed(() => data()?.priorityIncidents ?? []),
    priorityTickets: computed(() => data()?.priorityTickets ?? []),
    topServices: computed(() => data()?.topServices ?? []),
    trend: computed(() => data()?.trend ?? []),
    logsAvailable: computed(() => data()?.logsAvailable ?? true),
  })),
  withMethods((store, service = inject(AdminDashboardService)) => ({
    loadDashboard: rxMethod<{ silent?: boolean }>(
      pipe(
        tap(({ silent }) => patchState(store, {
          isLoading: !silent,
          error: null,
        })),
        switchMap(() => service.getDashboard(
          store.period(),
          store.customFrom() ?? undefined,
          store.customTo() ?? undefined,
        ).pipe(
          tap((response) => patchState(store, {
            data: response.data,
            isLoading: false,
            error: null,
          })),
          catchError((error) => {
            console.error('[Admin Dashboard] Failed to load overview', error);
            patchState(store, {
              isLoading: false,
              error: 'Không thể tải dữ liệu bảng điều khiển. Vui lòng thử lại.',
            });
            return EMPTY;
          }),
        )),
      ),
    ),

    loadResources: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isRefreshingResources: true, resourceError: null })),
        switchMap(() => service.getResources(
          store.period(),
          store.customFrom() ?? undefined,
          store.customTo() ?? undefined,
        ).pipe(
          tap((response) => patchState(store, {
            resources: response.data,
            isRefreshingResources: false,
            resourceError: response.data.status === 'UNAVAILABLE'
              ? response.data.message || 'Không thể đọc tài nguyên máy chủ.'
              : null,
          })),
          catchError((error) => {
            console.error('[Admin Dashboard] Failed to load resources', error);
            patchState(store, {
              isRefreshingResources: false,
              resourceError: 'Không thể kết nối dịch vụ đo tài nguyên.',
            });
            return EMPTY;
          }),
        )),
      ),
    ),

    setPeriod(period: Exclude<DashboardPeriod, 'CUSTOM'>) {
      patchState(store, { period, customFrom: null, customTo: null });
      this.loadDashboard({});
      this.loadResources();
    },

    setCustomRange(from: string, to: string) {
      patchState(store, { period: 'CUSTOM', customFrom: from, customTo: to });
      this.loadDashboard({});
      this.loadResources();
    },

    refreshAll() {
      this.loadDashboard({});
      this.loadResources();
    },
  })),
);
