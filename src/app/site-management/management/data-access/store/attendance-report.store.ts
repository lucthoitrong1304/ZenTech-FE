import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { AttendanceService } from '../services/attendance.service';
import { AttendanceRecordResponse, AttendanceStatisticsResponse } from '../models/attendance.model';

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
const lastWeek = new Date(today);
lastWeek.setDate(lastWeek.getDate() - 7);

const initialState: AttendanceReportState = {
  records: [],
  statistics: null,
  isLoading: false,
  error: null,
  totalRecords: 0,
  page: 0,
  size: 10,
  startDate: formatDate(lastWeek),
  endDate: formatDate(today),
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
          return attendanceService.getReport(store.startDate(), store.endDate(), store.page(), store.size()).pipe(
            tapResponse({
              next: (response) => {
                patchState(store, {
                  records: response.data.records.content,
                  totalRecords: response.data.records.totalElements,
                  statistics: response.data.statistics,
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
