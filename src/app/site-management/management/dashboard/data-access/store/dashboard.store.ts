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
import { PermissionService } from '../../../../../core/permissions/permission.service';
import { PermissionCode } from '../../../../../core/permissions/permission.models';

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
    const permissionService = inject(PermissionService);

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
        switchMap(({ period, startDate, endDate }) => permissionService.ensureLoaded().pipe(
          switchMap(() => {
            const canViewReports = permissionService.has(PermissionCode.REPORT_VIEW);
            const canViewOrders = permissionService.has(PermissionCode.ORDER_VIEW);
            const canViewChat = permissionService.has(PermissionCode.CHAT_VIEW);
            const customStart = startDate || undefined;
            const customEnd = endDate || undefined;
            const periodRange = getLocalPeriodRange(period, startDate, endDate);
            const effectiveStart = periodRange.start;
            const effectiveEnd = periodRange.end;

            const emptyPermissionMessage = 'Không có quyền xem dữ liệu này';
            const emptySummary = { success: false, data: null, message: emptyPermissionMessage };
            const emptyList = { success: false, data: [], message: emptyPermissionMessage };
            const emptyIncidentPage = { success: false, data: { content: [] }, message: emptyPermissionMessage };
            const emptyOrdersPage = { orders: [], page: 0, size: 5, totalElements: 0, totalPages: 0, last: true };
            const emptyTodayOrdersPage = { orders: [], page: 0, size: 100, totalElements: 0, totalPages: 0, last: true };
            const emptyTicketsPage = { content: [], totalElements: 0, totalPages: 0, size: 15, page: 0, last: true };

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

            const ticketQuery: ManagementTicketQuery = {
              page: 0,
              size: 15,
              status: 'ALL',
              priority: 'ALL',
              assigneeEmail: 'ALL',
              customerEmail: '',
              search: '',
              startDate: effectiveStart,
              endDate: effectiveEnd,
            };

            return forkJoin({
              summary: canViewReports ? reportsService.getSummary(period, customStart, customEnd).pipe(
                catchError(() => of({ success: false, data: null, message: '' }))
              ) : of(emptySummary),
              revenueSeries: canViewReports ? reportsService.getRevenueSeries(period, customStart, customEnd).pipe(
                catchError(() => of({ success: false, data: [], message: '' }))
              ) : of(emptyList),
              products: canViewReports ? reportsService.getProductPerformance(period, customStart, customEnd).pipe(
                catchError(() => of({ success: false, data: [], message: '' }))
              ) : of(emptyList),
              ordersPage: canViewOrders ? orderService.getOrders(orderQuery).pipe(
                catchError(() => of(emptyOrdersPage))
              ) : of(emptyOrdersPage),
              todayRevenueOrdersPage: canViewOrders ? orderService.getOrders(todayRevenueOrderQuery).pipe(
                catchError(() => of(emptyTodayOrdersPage))
              ) : of(emptyTodayOrdersPage),
              impactStats: canViewReports ? impactService.getDashboardStats(effectiveStart, effectiveEnd).pipe(
                catchError(() => of({ success: false, data: null, message: '' }))
              ) : of(emptySummary),
              incidentsPage: canViewReports ? impactService.getIncidents(0, 5, null, effectiveStart, effectiveEnd).pipe(
                catchError(() => of(emptyIncidentPage))
              ) : of(emptyIncidentPage),
              activeIncidentsPage: canViewReports ? impactService.getIncidents(0, 50, null).pipe(
                catchError(() => of(emptyIncidentPage))
              ) : of(emptyIncidentPage),
              ticketsPage: canViewChat ? ticketService.getTickets(ticketQuery).pipe(
                catchError(() => of(emptyTicketsPage))
              ) : of(emptyTicketsPage),
            }).pipe(
              tap({
                next: (results) => {
                  const activeTickets = (results.ticketsPage.content || []).filter(
                    (t) => t.status !== TicketStatus.RESOLVED
                  );
                  const activeIncidents = (results.activeIncidentsPage.data.content || []).filter(
                    (incident) => !['RESOLVED', 'CLOSED', 'DONE'].includes(String(incident.status || '').toUpperCase())
                  );

                  patchState(store, {
                    summary: results.summary.data ?? null,
                    revenueSeries: results.revenueSeries.data,
                    products: (results.products.data || []).slice(0, 5),
                    recentOrders: results.ordersPage.orders,
                    todayRevenueOrders: results.todayRevenueOrdersPage.orders || [],
                    impactStats: results.impactStats.data ?? null,
                    incidents: results.incidentsPage.data.content || [],
                    activeIncidents,
                    activeTickets: activeTickets.slice(0, 5),
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
        ))
      )
    );
    const loadIncidentDetail = rxMethod<string>(
      pipe(
        tap(() => patchState(store, { loadingIncidentDetail: true, showIncidentDialog: true })),
        switchMap((incidentId) => {
          if (!permissionService.has(PermissionCode.REPORT_VIEW)) {
            patchState(store, {
              loadingIncidentDetail: false,
              errorMessage: 'Không có quyền xem dữ liệu này',
            });
            return EMPTY;
          }

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
          if (!permissionService.has(PermissionCode.REPORT_ANALYZE)) {
            patchState(store, { loadingIncidentDetail: false });
            return EMPTY;
          }

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
