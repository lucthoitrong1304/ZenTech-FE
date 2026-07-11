import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { forkJoin, pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { AttendanceService } from '@/site-management/management/data-access/services/attendance.service';
import {
  AttendanceLocationPolicy,
  AttendanceRecordResponse,
  AttendanceStatisticsResponse
} from '@/site-management/management/data-access/models/attendance.model';

export interface AttendanceReportState {
  records: AttendanceRecordResponse[];
  statistics: AttendanceStatisticsResponse | null;
  isLoading: boolean;
  error: string | null;
  totalRecords: number;
  page: number;
  size: number;
  startDate: string;
  endDate: string;
  locationPolicy: AttendanceLocationPolicy | null;
}

const formatDate = (date: Date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
};

const today = new Date();

const initialState: AttendanceReportState = {
  records: [],
  statistics: null,
  isLoading: false,
  error: null,
  totalRecords: 0,
  page: 0,
  size: 10,
  startDate: formatDate(today),
  endDate: formatDate(today),
  locationPolicy: null,
};

export const AttendanceReportStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, attendanceService = inject(AttendanceService)) => ({
    updateFilter: (startDate: string, endDate: string) => {
      patchState(store, { startDate, endDate, page: 0 });
    },
    updatePagination: (page: number, size: number) => {
      patchState(store, { page, size });
    },
    loadReport: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap(() => {
          return forkJoin({
            report: attendanceService.getReport(store.startDate(), store.endDate(), store.page(), store.size()),
            locationPolicy: attendanceService.getLocationPolicy(),
          }).pipe(
            tapResponse({
              next: ({ report, locationPolicy }) => {
                patchState(store, {
                  records: report.data.records.content,
                  totalRecords: report.data.records.totalElements,
                  statistics: report.data.statistics,
                  locationPolicy: normalizeLocationPolicy(locationPolicy.data),
                  isLoading: false,
                });
              },
              error: (err: any) => {
                const errorMsg = err.error?.message || err.message || 'Lỗi không xác định';
                patchState(store, { error: errorMsg, isLoading: false });
              },
            })
          );
        })
      )
    )
  }))
);

function normalizeLocationPolicy(policy: AttendanceLocationPolicy | null | undefined): AttendanceLocationPolicy | null {
  if (!policy) {
    return null;
  }

  return {
    id: policy.id ?? null,
    enabled: !!policy.enabled,
    shapeType: policy.shapeType ?? 'CIRCLE',
    centerLatitude: policy.centerLatitude ?? null,
    centerLongitude: policy.centerLongitude ?? null,
    radiusMeters: policy.radiusMeters ?? 100,
    polygonPoints: policy.polygonPoints ?? [],
    updatedAt: policy.updatedAt ?? null,
    updatedBy: policy.updatedBy ?? null,
  };
}
