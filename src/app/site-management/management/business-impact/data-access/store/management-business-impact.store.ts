import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { ManagementBusinessImpactService } from '../services/management-business-impact.service';
import { ManagementImpactDashboardDto, ManagementIncidentImpactDto, AffectedUserDetail } from '../models/management-business-impact.model';

const getInitialDates = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString()
  };
};

const defaultDates = getInitialDates();

export interface ManagementBusinessImpactState {
  dashboard: ManagementImpactDashboardDto | null;
  incidents: ManagementIncidentImpactDto[];
  totalRecords: number;
  page: number;
  size: number;
  selectedIncident: ManagementIncidentImpactDto | null;
  affectedUsersList: AffectedUserDetail[];
  isLoadingDashboard: boolean;
  isLoadingIncidents: boolean;
  isLoadingDetail: boolean;
  isLoadingAffectedUsers: boolean;
  isAnalyzingAi: boolean;
  error: string | null;
  search: string;
  datePreset: string;
  startDate: string | null;
  endDate: string | null;
}

const initialState: ManagementBusinessImpactState = {
  dashboard: null,
  incidents: [],
  totalRecords: 0,
  page: 0,
  size: 10,
  selectedIncident: null,
  affectedUsersList: [],
  isLoadingDashboard: false,
  isLoadingIncidents: false,
  isLoadingDetail: false,
  isLoadingAffectedUsers: false,
  isAnalyzingAi: false,
  error: null,
  search: '',
  datePreset: 'LAST_7_DAYS',
  startDate: defaultDates.startDate,
  endDate: defaultDates.endDate,
};

export const ManagementBusinessImpactStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, impactService = inject(ManagementBusinessImpactService)) => ({
    updatePagination(page: number, size: number) {
      patchState(store, { page, size });
    },
    
    updateFilters(filters: { search: string; datePreset: string; startDate: string | null; endDate: string | null }) {
      patchState(store, {
        search: filters.search,
        datePreset: filters.datePreset,
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: 0, // Reset to first page when filtering
      });
    },
    
    setSelectedIncident(incident: ManagementIncidentImpactDto | null) {
      patchState(store, { selectedIncident: incident });
    },

    loadDashboard: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoadingDashboard: true, error: null })),
        switchMap(() =>
          impactService.getDashboardStats(store.startDate(), store.endDate()).pipe(
            tapResponse({
              next: (response) => {
                patchState(store, {
                  dashboard: response.data,
                  isLoadingDashboard: false,
                });
              },
              error: (err: any) => {
                const errorMsg = err.error?.message || err.message || 'Lỗi tải thống kê dashboard';
                patchState(store, { error: errorMsg, isLoadingDashboard: false });
              },
            })
          )
        )
      )
    ),

    loadIncidents: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoadingIncidents: true, error: null })),
        switchMap(() =>
          impactService.getIncidents(
            store.page(),
            store.size(),
            store.search(),
            store.startDate(),
            store.endDate()
          ).pipe(
            tapResponse({
              next: (response) => {
                patchState(store, {
                  incidents: response.data.content,
                  totalRecords: response.data.totalElements,
                  isLoadingIncidents: false,
                });
              },
              error: (err: any) => {
                const errorMsg = err.error?.message || err.message || 'Lỗi tải danh sách sự cố';
                patchState(store, { error: errorMsg, isLoadingIncidents: false });
              },
            })
          )
        )
      )
    ),

    loadIncidentDetail: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { isLoadingDetail: true, error: null })),
        switchMap((incidentId) =>
          impactService.getIncidentDetail(incidentId).pipe(
            tapResponse({
              next: (response) => {
                patchState(store, {
                  selectedIncident: response.data,
                  isLoadingDetail: false,
                });
              },
              error: (err: any) => {
                const errorMsg = err.error?.message || err.message || 'Lỗi tải chi tiết sự cố';
                patchState(store, { error: errorMsg, isLoadingDetail: false });
              },
            })
          )
        )
      )
    ),

    analyzeIncidentAi: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { isAnalyzingAi: true, error: null })),
        switchMap((incidentId) =>
          impactService.analyzeAi(incidentId).pipe(
            tapResponse({
              next: (response) => {
                patchState(store, {
                  selectedIncident: response.data,
                  isAnalyzingAi: false,
                });
                // Đồng bộ cập nhật lại danh sách incidents nếu incident này đang hiển thị trong bảng
                const updatedIncidents = store.incidents().map((inc) =>
                  inc.incidentId === incidentId ? response.data : inc
                );
                patchState(store, { incidents: updatedIncidents });
              },
              error: (err: any) => {
                const errorMsg = err.error?.message || err.message || 'AI phân tích thất bại';
                patchState(store, { error: errorMsg, isAnalyzingAi: false });
              },
            })
          )
        )
      )
    ),

    loadAffectedUsers: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { isLoadingAffectedUsers: true, error: null })),
        switchMap((incidentId) =>
          impactService.getAffectedUsers(incidentId).pipe(
            tapResponse({
              next: (response) => {
                patchState(store, {
                  affectedUsersList: response.data,
                  isLoadingAffectedUsers: false,
                });
              },
              error: (err: any) => {
                const errorMsg = err.error?.message || err.message || 'Lỗi tải danh sách người dùng bị ảnh hưởng';
                patchState(store, { error: errorMsg, isLoadingAffectedUsers: false });
              },
            })
          )
        )
      )
    ),
  }))
);
