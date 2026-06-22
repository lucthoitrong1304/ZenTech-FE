import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, forkJoin, pipe, switchMap, tap } from 'rxjs';
import {
  IReportsSummary,
  IRevenuePoint,
  IProductReport,
  IAIOpsInsight,
  ReportPeriod,
} from '../../../reports/data-access/models/reports.model';
import { ReportsService } from '../../../reports/data-access/services/reports.service';
import { ManagementOrderService } from '../../../orders/data-access/services/management-order.service';
import { ManagementOrder, ManagementOrderQuery } from '../../../orders/data-access/models/management-order.models';
import { ManagementBusinessImpactService } from '../../../business-impact/data-access/services/management-business-impact.service';
import {
  ManagementImpactDashboardDto,
  ManagementIncidentImpactDto,
  AffectedUserDetail,
} from '../../../business-impact/data-access/models/management-business-impact.model';
import { ManagementTicketService } from '../../../tickets/data-access/services/management-ticket.service';
import { ManagementTicket, ManagementTicketQuery, TicketStatus } from '../../../tickets/data-access/models/management-ticket.models';

export interface DashboardUiState {
  period: ReportPeriod;
  customStartDate: string | null;
  customEndDate: string | null;
  loading: boolean;
  errorMessage: string | null;
  summary: IReportsSummary | null;
  revenueSeries: IRevenuePoint[];
  products: IProductReport[];
  insights: IAIOpsInsight[];
  recentOrders: ManagementOrder[];
  impactStats: ManagementImpactDashboardDto | null;
  incidents: ManagementIncidentImpactDto[];
  activeTickets: ManagementTicket[];
  activeTab: 'orders' | 'incidents' | 'tickets';
  aiSalesModeActive: boolean;
  showAiConfirmDialog: boolean;
  selectedInsight: IAIOpsInsight | null;
  selectedIncident: ManagementIncidentImpactDto | null;
  affectedUsers: AffectedUserDetail[];
  loadingIncidentDetail: boolean;
  showIncidentDialog: boolean;
  executingAiAction: boolean;
}

const INITIAL_STATE: DashboardUiState = {
  period: ReportPeriod.Last30Days,
  customStartDate: null,
  customEndDate: null,
  loading: false,
  errorMessage: null,
  summary: null,
  revenueSeries: [],
  products: [],
  insights: [],
  recentOrders: [],
  impactStats: null,
  incidents: [],
  activeTickets: [],
  activeTab: 'orders',
  aiSalesModeActive: true,
  showAiConfirmDialog: false,
  selectedInsight: null,
  selectedIncident: null,
  affectedUsers: [],
  loadingIncidentDetail: false,
  showIncidentDialog: false,
  executingAiAction: false,
};

export const DashboardStore = signalStore(
  withState<DashboardUiState>(INITIAL_STATE),
  withMethods((store) => {
    const reportsService = inject(ReportsService);
    const orderService = inject(ManagementOrderService);
    const impactService = inject(ManagementBusinessImpactService);
    const ticketService = inject(ManagementTicketService);

    const loadDashboardData = rxMethod<{
      period: ReportPeriod;
      startDate?: string | null;
      endDate?: string | null;
      silent?: boolean;
    }>(
      pipe(
        tap(({ silent }) => {
          if (!silent) {
            patchState(store, { loading: true, errorMessage: null });
          } else {
            patchState(store, { errorMessage: null });
          }
        }),
        switchMap(({ period, startDate, endDate }) => {
          const customStart = startDate || undefined;
          const customEnd = endDate || undefined;

          // Prepare order query
          const orderQuery: ManagementOrderQuery = {
            page: 0,
            size: 5,
            sort: 'createdAt,desc',
            keyword: '',
            status: 'all',
            dateFilter: period === ReportPeriod.Custom ? 'all' : (
              period === ReportPeriod.Today ? 'today' : (
                period === ReportPeriod.Last7Days ? 'last7days' : 'last30days'
              )
            ),
            startDate: customStart,
            endDate: customEnd,
          };

          // Prepare system fix tickets query
          const ticketQuery: ManagementTicketQuery = {
            page: 0,
            size: 15, // Get more to filter unresolved in client
            status: 'ALL',
            priority: 'ALL',
            assigneeEmail: 'ALL',
            customerEmail: '',
            search: '',
            startDate: customStart,
            endDate: customEnd,
          };

          return forkJoin({
            summary: reportsService.getSummary(period, customStart, customEnd),
            revenueSeries: reportsService.getRevenueSeries(period, customStart, customEnd),
            products: reportsService.getProductPerformance(period, customStart, customEnd),
            insights: reportsService.getAIOpsInsights(period, customStart, customEnd),
            ordersPage: orderService.getOrders(orderQuery),
            impactStats: impactService.getDashboardStats(customStart, customEnd),
            incidentsPage: impactService.getIncidents(0, 5, null, customStart, customEnd),
            ticketsPage: ticketService.getTickets(ticketQuery),
          }).pipe(
            tap({
              next: (results) => {
                // Filter active unresolved technical tickets
                const activeTickets = (results.ticketsPage.content || []).filter(
                  (t) => t.status !== TicketStatus.RESOLVED
                );

                patchState(store, {
                  summary: results.summary.data,
                  revenueSeries: results.revenueSeries.data,
                  products: (results.products.data || []).slice(0, 5), // Keep top 5 best sellers
                  insights: results.insights.data,
                  recentOrders: results.ordersPage.orders,
                  impactStats: results.impactStats.data,
                  incidents: results.incidentsPage.data.content || [],
                  activeTickets: activeTickets.slice(0, 5), // Keep top 5 active tickets
                  loading: false,
                });
              },
              error: (err) => {
                console.error('Failed to load dashboard metrics:', err);
                patchState(store, {
                  loading: false,
                  errorMessage: 'Không thể đồng bộ dữ liệu từ hệ thống quản trị kinh doanh.',
                });
              },
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    const loadIncidentDetail = rxMethod<string>(
      pipe(
        tap(() => patchState(store, { loadingIncidentDetail: true, showIncidentDialog: true })),
        switchMap((incidentId) => {
          return forkJoin({
            detail: impactService.getIncidentDetail(incidentId),
            users: impactService.getAffectedUsers(incidentId),
          }).pipe(
            tap({
              next: (results) => {
                patchState(store, {
                  selectedIncident: results.detail.data,
                  affectedUsers: results.users.data || [],
                  loadingIncidentDetail: false,
                });
              },
              error: (err) => {
                console.error('Failed to load incident details:', err);
                patchState(store, {
                  loadingIncidentDetail: false,
                  errorMessage: 'Không thể tải chi tiết sự cố kỹ thuật.',
                });
              },
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    const runAiIncidentMitigation = rxMethod<string>(
      pipe(
        tap(() => patchState(store, { executingAiAction: true })),
        switchMap((incidentId) => {
          // Simulate AI mitigation execution with 1.5s delay
          return new Promise<void>((resolve) => setTimeout(resolve, 1500)).then(() => {
            // Update selected incident state and local incidents list to resolved
            const updatedIncidents = store.incidents().map((inc) => {
              if (inc.incidentId === incidentId) {
                return { ...inc, status: 'RESOLVED' as any, resolvedAt: new Date().toISOString() };
              }
              return inc;
            });

            patchState(store, {
              executingAiAction: false,
              showIncidentDialog: false,
              selectedIncident: null,
              affectedUsers: [],
              incidents: updatedIncidents,
            });
          });
        })
      )
    );

    const requestIncidentAiAnalysis = rxMethod<string>(
      pipe(
        tap(() => patchState(store, { loadingIncidentDetail: true })),
        switchMap((incidentId) => {
          return impactService.analyzeAi(incidentId).pipe(
            tap({
              next: (res) => {
                // Update selected incident with AI summary
                if (store.selectedIncident()?.incidentId === incidentId) {
                  patchState(store, {
                    selectedIncident: res.data,
                    loadingIncidentDetail: false,
                  });
                }
              },
              error: (err) => {
                console.error('Failed to request AI analysis:', err);
                patchState(store, { loadingIncidentDetail: false });
              },
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    return {
      loadDashboardData,
      loadIncidentDetail,
      runAiIncidentMitigation,
      requestIncidentAiAnalysis,
      setActiveTab(activeTab: 'orders' | 'incidents' | 'tickets') {
        patchState(store, { activeTab });
      },
      setPeriod(period: ReportPeriod) {
        patchState(store, { period });
        if (period !== ReportPeriod.Custom) {
          patchState(store, { customStartDate: null, customEndDate: null });
          loadDashboardData({ period });
        }
      },
      setCustomDates(startDate: string, endDate: string) {
        patchState(store, {
          period: ReportPeriod.Custom,
          customStartDate: startDate,
          customEndDate: endDate,
        });
        loadDashboardData({
          period: ReportPeriod.Custom,
          startDate,
          endDate,
        });
      },
      toggleAiSalesMode(active: boolean) {
        patchState(store, { aiSalesModeActive: active });
      },
      setAiConfirmDialog(show: boolean, insight: IAIOpsInsight | null = null) {
        patchState(store, {
          showAiConfirmDialog: show,
          selectedInsight: insight,
        });
      },
      setShowIncidentDialog(show: boolean) {
        patchState(store, {
          showIncidentDialog: show,
          selectedIncident: show ? store.selectedIncident() : null,
          affectedUsers: show ? store.affectedUsers() : [],
        });
      },
      executeAiInsightAction: rxMethod<IAIOpsInsight>(
        pipe(
          tap(() => patchState(store, { executingAiAction: true })),
          switchMap((insight) => {
            return new Promise<void>((resolve) => setTimeout(resolve, 1200)).then(() => {
              patchState(store, {
                executingAiAction: false,
                showAiConfirmDialog: false,
                selectedInsight: null,
                insights: store.insights().filter((x) => x.id !== insight.id),
              });
            });
          })
        )
      ),
    };
  })
);
