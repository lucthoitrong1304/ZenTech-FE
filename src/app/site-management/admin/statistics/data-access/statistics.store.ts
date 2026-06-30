import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import { AdminStatisticsData, StatisticsPeriod } from './statistics.models';
import { AdminStatisticsService } from './statistics.service';

interface StatisticsState {
  period: StatisticsPeriod;
  customFrom: string | null;
  customTo: string | null;
  data: AdminStatisticsData | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: StatisticsState = {
  period: 'TODAY',
  customFrom: null,
  customTo: null,
  data: null,
  isLoading: false,
  error: null,
};

export const AdminStatisticsStore = signalStore(
  withState(initialState),
  withComputed(({ data }) => ({
    totalErrors: computed(() => data()?.totalErrors ?? 0),
    incidentsInPeriod: computed(() => data()?.incidentsInPeriod ?? 0),
    ticketsCreated: computed(() => data()?.ticketsCreated ?? 0),
    ticketsResolved: computed(() => data()?.ticketsResolved ?? 0),
    ticketResolutionRate: computed(() => data()?.ticketResolutionRate ?? 0),
    trend: computed(() => data()?.errorTrend ?? []),
    topApis: computed(() => data()?.topApis ?? []),
    topServices: computed(() => data()?.topServices ?? []),
    topAffectedUsers: computed(() => data()?.topAffectedUsers ?? []),
    logsAvailable: computed(() => data()?.logsAvailable ?? true),
    partialData: computed(() => data()?.partialData ?? false),
    generatedAt: computed(() => data()?.generatedAt ?? null),
  })),
  withMethods((store, service = inject(AdminStatisticsService)) => ({
    load: rxMethod<{ silent?: boolean }>(
      pipe(
        tap(({ silent }) => patchState(store, { isLoading: !silent, error: null })),
        switchMap(() =>
          service
            .getStatistics(
              store.period(),
              store.customFrom() ?? undefined,
              store.customTo() ?? undefined,
            )
            .pipe(
              tap((response) =>
                patchState(store, {
                  data: response.data,
                  isLoading: false,
                  error: null,
                }),
              ),
              catchError((error) => {
                console.error('[Admin Statistics] Failed to load statistics', error);
                patchState(store, {
                  isLoading: false,
                  error: 'Không thể tải dữ liệu thống kê. Vui lòng thử lại.',
                });
                return EMPTY;
              }),
            ),
        ),
      ),
    ),

    setPeriod(period: Exclude<StatisticsPeriod, 'CUSTOM'>) {
      patchState(store, { period, customFrom: null, customTo: null });
      this.load({});
    },

    setCustomRange(from: string, to: string) {
      patchState(store, { period: 'CUSTOM', customFrom: from, customTo: to });
      this.load({});
    },

    refresh(silent = false) {
      this.load({ silent });
    },
  })),
);
