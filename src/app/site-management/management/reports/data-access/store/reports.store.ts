import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, forkJoin, pipe, switchMap, tap } from 'rxjs';
import {
  IReportsSummary,
  IRevenuePoint,
  IProductReport,
  ICouponReport,
  ICustomerSegment,
  IAIOpsInsight,
  ReportPeriod,
  ReportsTab,
  IPaymentMethodShare,
  ICategoryShare,
  IInventoryStats,
} from '../models/reports.model';
import { ReportsEvent } from '../models/reports.event';
import { ReportsService } from '../services/reports.service';

interface ReportsUiState {
  activeTab: ReportsTab;
  period: ReportPeriod;
  summary: IReportsSummary | null;
  revenueSeries: IRevenuePoint[];
  products: IProductReport[];
  coupons: ICouponReport[];
  customers: ICustomerSegment[];
  insights: IAIOpsInsight[];
  paymentMethods: IPaymentMethodShare[];
  categories: ICategoryShare[];
  inventoryStats: IInventoryStats | null;
  loading: boolean;
  isAnalyzing: boolean;
  aiAnalysisResult: string | null;
  errorMessage: string | null;
}

const INITIAL_STATE: ReportsUiState = {
  activeTab: ReportsTab.AIOps,
  period: ReportPeriod.Last30Days,
  summary: null,
  revenueSeries: [],
  products: [],
  coupons: [],
  customers: [],
  insights: [],
  paymentMethods: [],
  categories: [],
  inventoryStats: null,
  loading: false,
  isAnalyzing: false,
  aiAnalysisResult: null,
  errorMessage: null,
};

export const ReportsStore = signalStore(
  withState<ReportsUiState>(INITIAL_STATE),
  withComputed(({ activeTab, loading }) => ({
    isAIOpsActive: computed(() => activeTab() === ReportsTab.AIOps),
    isRevenueActive: computed(() => activeTab() === ReportsTab.Revenue),
    isProductsActive: computed(() => activeTab() === ReportsTab.Products),
    isInventoryActive: computed(() => activeTab() === ReportsTab.Inventory),
    hasInsights: computed(() => !loading()),
  })),
  withMethods((store, reportsService = inject(ReportsService)) => {
    const loadAllReports = rxMethod<
      ReportPeriod | { period: ReportPeriod; startDate?: string; endDate?: string }
    >(
      pipe(
        tap(() => patchState(store, { loading: true, errorMessage: null })),
        switchMap((arg) => {
          const period = typeof arg === 'string' ? arg : arg.period;
          const startDate = typeof arg === 'string' ? undefined : arg.startDate;
          const endDate = typeof arg === 'string' ? undefined : arg.endDate;

          return forkJoin({
            summary: reportsService.getSummary(period, startDate, endDate),
            revenueSeries: reportsService.getRevenueSeries(period, startDate, endDate),
            products: reportsService.getProductPerformance(period, startDate, endDate),
            coupons: reportsService.getCouponPerformance(period, startDate, endDate),
            customers: reportsService.getCustomerSegments(period, startDate, endDate),
            insights: reportsService.getAIOpsInsights(period, startDate, endDate),
            paymentMethods: reportsService.getPaymentMethods(period, startDate, endDate),
            categories: reportsService.getCategories(period, startDate, endDate),
            inventoryStats: reportsService.getInventoryStats(period, startDate, endDate),
          }).pipe(
            tap({
              next: (results) => {
                patchState(store, {
                  summary: results.summary.data,
                  revenueSeries: results.revenueSeries.data,
                  products: results.products.data,
                  coupons: results.coupons.data,
                  customers: results.customers.data,
                  insights: results.insights.data,
                  paymentMethods: results.paymentMethods.data,
                  categories: results.categories.data,
                  inventoryStats: results.inventoryStats.data,
                  loading: false,
                });
              },
              error: (err) => {
                patchState(store, {
                  loading: false,
                  errorMessage: 'Không thể tải dữ liệu báo cáo thống kê.',
                });
              },
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    const analyzeCurrentTab = rxMethod<{ tab: ReportsTab; period: ReportPeriod }>(
      pipe(
        tap(() => patchState(store, { isAnalyzing: true, aiAnalysisResult: null, errorMessage: null })),
        switchMap(({ tab, period }) => {
          return reportsService.analyzeReport(tab, period).pipe(
            tap({
              next: (result) => {
                patchState(store, {
                  isAnalyzing: false,
                  aiAnalysisResult: result.data.content,
                });
              },
              error: (err) => {
                patchState(store, {
                  isAnalyzing: false,
                  errorMessage: 'AI phân tích thất bại.',
                });
              }
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    const handleEvent = (event: { type: ReportsEvent; payload?: unknown }): void => {
      switch (event.type) {
        case ReportsEvent.TabChanged:
          patchState(store, { activeTab: event.payload as ReportsTab, aiAnalysisResult: null });
          break;

        case ReportsEvent.PeriodChanged: {
          const newPeriod = event.payload as ReportPeriod;
          patchState(store, { period: newPeriod });
          loadAllReports(newPeriod);
          break;
        }

        case ReportsEvent.RefreshRequested:
          loadAllReports(store.period());
          break;

        case ReportsEvent.AnalyzeClicked:
          const targetTab = (event.payload as string) || store.activeTab();
          analyzeCurrentTab({ tab: targetTab as ReportsTab, period: store.period() });
          break;
      }
    };

    return {
      dispatch: handleEvent,
      loadAllReports,
      setTab(tab: ReportsTab): void {
        handleEvent({ type: ReportsEvent.TabChanged, payload: tab });
      },
      setPeriod(period: ReportPeriod): void {
        handleEvent({ type: ReportsEvent.PeriodChanged, payload: period });
      },
      refresh(): void {
        handleEvent({ type: ReportsEvent.RefreshRequested });
      },
    };
  })
);
