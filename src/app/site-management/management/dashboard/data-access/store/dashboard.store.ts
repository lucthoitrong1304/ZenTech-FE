import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, forkJoin, of, pipe, switchMap, tap } from 'rxjs';
import {
  IReportsSummary,
  IRevenuePoint,
  IProductReport,
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
  recentOrders: ManagementOrder[];
  todayRevenueOrders: ManagementOrder[];
  impactStats: ManagementImpactDashboardDto | null;
  incidents: ManagementIncidentImpactDto[];
  activeIncidents: ManagementIncidentImpactDto[];
  activeTickets: ManagementTicket[];
  activeTab: 'orders' | 'incidents' | 'tickets';
  selectedIncident: ManagementIncidentImpactDto | null;
  affectedUsers: AffectedUserDetail[];
  loadingIncidentDetail: boolean;
  showIncidentDialog: boolean;
}

function getLocalPeriodRange(period: ReportPeriod, startDate?: string | null, endDate?: string | null): { start?: string; end?: string } {
  if (period === ReportPeriod.Custom) {
    return {
      start: startDate || undefined,
      end: endDate || undefined,
    };
  }

  const now = new Date();
  const start = new Date(now);
  const daysBack = period === ReportPeriod.Today
    ? 0
    : period === ReportPeriod.Last7Days
      ? 6
      : 29;

  start.setDate(now.getDate() - daysBack);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
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
  recentOrders: [],
  todayRevenueOrders: [],
  impactStats: null,
  incidents: [],
  activeIncidents: [],
  activeTickets: [],
  activeTab: 'orders',
  selectedIncident: null,
  affectedUsers: [],
  loadingIncidentDetail: false,
  showIncidentDialog: false,
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
          const periodRange = getLocalPeriodRange(period, startDate, endDate);
          const effectiveStart = periodRange.start;
          const effectiveEnd = periodRange.end;

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

          const todayOrderRange = getLocalPeriodRange(ReportPeriod.Today);
          const todayRevenueOrderQuery: ManagementOrderQuery = {
            page: 0,
            size: 100,
            sort: 'createdAt,asc',
            keyword: '',
            status: 'all',
            dateFilter: 'all',
            startDate: todayOrderRange.start,
            endDate: todayOrderRange.end,
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
            startDate: effectiveStart,
            endDate: effectiveEnd,
          };

          return forkJoin({
            summary: reportsService.getSummary(period, customStart, customEnd).pipe(
              catchError(() => of({ success: false, data: null, message: '' }))
            ),
            revenueSeries: reportsService.getRevenueSeries(period, customStart, customEnd).pipe(
              catchError(() => of({ success: false, data: [], message: '' }))
            ),
            products: reportsService.getProductPerformance(period, customStart, customEnd).pipe(
              catchError(() => of({ success: false, data: [], message: '' }))
            ),
            ordersPage: orderService.getOrders(orderQuery).pipe(
              catchError(() => of({ orders: [], page: 0, size: 5, totalElements: 0, totalPages: 0, last: true }))
            ),
            todayRevenueOrdersPage: orderService.getOrders(todayRevenueOrderQuery).pipe(
              catchError(() => of({ orders: [], page: 0, size: 100, totalElements: 0, totalPages: 0, last: true }))
            ),
            impactStats: impactService.getDashboardStats(effectiveStart, effectiveEnd).pipe(
              catchError(() => of({ success: false, data: null, message: '' }))
            ),
            incidentsPage: impactService.getIncidents(0, 5, null, effectiveStart, effectiveEnd).pipe(
              catchError(() => of({ success: false, data: { content: [] }, message: '' }))
            ),
            activeIncidentsPage: impactService.getIncidents(0, 50, null).pipe(
              catchError(() => of({ success: false, data: { content: [] }, message: '' }))
            ),
            ticketsPage: ticketService.getTickets(ticketQuery).pipe(
              catchError(() => of({ content: [], totalElements: 0, totalPages: 0, size: 15, page: 0, last: true }))
            ),
          }).pipe(
            tap({
              next: (results) => {
                // Filter active unresolved technical tickets
                const activeTickets = (results.ticketsPage.content || []).filter(
                  (t) => t.status !== TicketStatus.RESOLVED
                );
                const activeIncidents = (results.activeIncidentsPage.data.content || []).filter(
                  (incident) => !['RESOLVED', 'CLOSED', 'DONE'].includes(String(incident.status || '').toUpperCase())
                );

                patchState(store, {
                  summary: results.summary.data ?? null,
                  revenueSeries: results.revenueSeries.data,
                  products: (results.products.data || []).slice(0, 5), // Keep top 5 best sellers
                  recentOrders: results.ordersPage.orders,
                  todayRevenueOrders: results.todayRevenueOrdersPage.orders || [],
                  impactStats: results.impactStats.data ?? null,
                  incidents: results.incidentsPage.data.content || [],
                  activeIncidents,
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
      setShowIncidentDialog(show: boolean) {
        patchState(store, {
          showIncidentDialog: show,
          selectedIncident: show ? store.selectedIncident() : null,
          affectedUsers: show ? store.affectedUsers() : [],
        });
      },
    };
  })
);
