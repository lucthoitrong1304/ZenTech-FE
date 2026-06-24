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
  period: '7D',
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
              error: 'Kh?ng th? t?i d? li?u b?ng ?i?u khi?n. Vui l?ng th? l?i.',
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
              ? response.data.message || 'Kh?ng th? ??c t?i nguy?n m?y ch?.'
              : null,
          })),
          catchError((error) => {
            console.error('[Admin Dashboard] Failed to load resources', error);
            patchState(store, {
              isRefreshingResources: false,
              resourceError: 'Kh?ng th? k?t n?i d?ch v? ?o t?i nguy?n.',
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
