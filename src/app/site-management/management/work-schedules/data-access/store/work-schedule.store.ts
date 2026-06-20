import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, forkJoin, pipe, switchMap, tap } from 'rxjs';
import {
  BulkAssignDraft,
  CopyWeekDraft,
  CreateShiftRequest,
  DailyShift,
  EmployeeWeeklySchedule,
  SelectedScheduleCell,
  Shift,
  ShiftSettingsDraft,
  WorkScheduleQuery,
} from '../models/work-schedule.models';
import { WorkScheduleService } from '../services/work-schedule.service';
import { addWeeks, formatDate, getWeekDates, getWeekEndDate, getWeekStart, parseDate } from './work-schedule-date.utils';

const today = new Date();
const currentWeekStart = formatDate(getWeekStart(today));

const DEFAULT_QUERY: WorkScheduleQuery = {
  weekStartDate: currentWeekStart,
  weekEndDate: getWeekEndDate(currentWeekStart),
  keyword: '',
  page: 0,
  size: 10,
};

const EMPTY_BULK_DRAFT: BulkAssignDraft = {
  shiftId: '',
  startDate: DEFAULT_QUERY.weekStartDate,
  endDate: DEFAULT_QUERY.weekEndDate,
  selectAll: false,
};

const EMPTY_COPY_DRAFT: CopyWeekDraft = {
  fromWeekStartDate: formatDate(addWeeks(parseDate(DEFAULT_QUERY.weekStartDate), -1)),
  fromWeekEndDate: getWeekEndDate(formatDate(addWeeks(parseDate(DEFAULT_QUERY.weekStartDate), -1))),
  toWeekStartDate: DEFAULT_QUERY.weekStartDate,
  toWeekEndDate: DEFAULT_QUERY.weekEndDate,
};

interface WorkScheduleState {
  query: WorkScheduleQuery;
  employees: EmployeeWeeklySchedule[];
  shifts: Shift[];
  totalElements: number;
  totalPages: number;
  last: boolean;
  loading: boolean;
  saving: boolean;
  selectedEmployeeIds: string[];
  selectedCell: SelectedScheduleCell | null;
  assignShiftId: string;
  assignModalOpen: boolean;
  bulkModalOpen: boolean;
  bulkDraft: BulkAssignDraft;
  copyModalOpen: boolean;
  copyDraft: CopyWeekDraft;
  settingsModalOpen: boolean;
  settingsDraft: ShiftSettingsDraft;
  reason: string;
  errorMessage: string | null;
  successMessage: string | null;
}

const INITIAL_STATE: WorkScheduleState = {
  query: DEFAULT_QUERY,
  employees: [],
  shifts: [],
  totalElements: 0,
  totalPages: 0,
  last: true,
  loading: false,
  saving: false,
  selectedEmployeeIds: [],
  selectedCell: null,
  assignShiftId: '',
  assignModalOpen: false,
  bulkModalOpen: false,
  bulkDraft: EMPTY_BULK_DRAFT,
  copyModalOpen: false,
  copyDraft: EMPTY_COPY_DRAFT,
  settingsModalOpen: false,
  settingsDraft: { shifts: [], newShift: null },
  reason: '',
  errorMessage: null,
  successMessage: null,
};

export const WorkScheduleStore = signalStore(
  withState<WorkScheduleState>(INITIAL_STATE),
  withComputed(({ query, employees, shifts, totalElements, totalPages, selectedEmployeeIds, saving, selectedCell, assignShiftId, bulkDraft }) => ({
    weekDates: computed(() => getWeekDates(query().weekStartDate)),
    pageStart: computed(() => (totalElements() === 0 ? 0 : query().page * query().size + 1)),
    pageEnd: computed(() => Math.min((query().page + 1) * query().size, totalElements())),
    canGoPrevious: computed(() => query().page > 0),
    canGoNext: computed(() => query().page + 1 < totalPages()),
    hasEmployees: computed(() => employees().length > 0),
    hasShifts: computed(() => shifts().length > 0),
    allVisibleSelected: computed(() => {
      const ids = employees().map(employee => employee.employeeId);

      return ids.length > 0 && ids.every(id => selectedEmployeeIds().includes(id));
    }),
    selectedCount: computed(() => selectedEmployeeIds().length),
    canSubmitAssign: computed(() => !!selectedCell() && !!assignShiftId() && !saving()),
    canSubmitBulk: computed(() => {
      const draft = bulkDraft();

      return !!draft.shiftId && !!draft.startDate && !!draft.endDate && (draft.selectAll || selectedEmployeeIds().length > 0) && !saving();
    }),
  })),
  withMethods((store, workScheduleService = inject(WorkScheduleService)) => {
    const applyPage = (page: {
      employees: EmployeeWeeklySchedule[];
      page: number;
      size: number;
      totalElements: number;
      totalPages: number;
      last: boolean;
    }): void => {
      patchState(store, {
        employees: page.employees,
        totalElements: page.totalElements,
        totalPages: page.totalPages,
        last: page.last,
        query: {
          ...store.query(),
          page: page.page,
          size: page.size,
        },
        loading: false,
        errorMessage: null,
      });
    };

    const loadWorkspace = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, errorMessage: null })),
        switchMap(() =>
          forkJoin({
            shifts: workScheduleService.getShifts(),
            page: workScheduleService.getWeeklySchedules(store.query()),
          }).pipe(
            tap({
              next: result => {
                applyPage(result.page);
                patchState(store, { shifts: result.shifts });
              },
              error: () =>
                patchState(store, {
                  employees: [],
                  shifts: [],
                  totalElements: 0,
                  totalPages: 0,
                  last: true,
                  loading: false,
                  errorMessage: 'Khong the tai lich lam viec.',
                }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const reloadSchedules = (): void => {
      patchState(store, { loading: true, errorMessage: null });
      workScheduleService
        .getWeeklySchedules(store.query())
        .pipe(
          tap({
            next: page => applyPage(page),
            error: () =>
              patchState(store, {
                loading: false,
                errorMessage: 'Khong the tai lai lich lam viec.',
              }),
          }),
          catchError(() => EMPTY)
        )
        .subscribe();
    };

    const assignShift = rxMethod<void>(
      pipe(
        switchMap(() => {
          const cell = store.selectedCell();
          const shiftId = store.assignShiftId();

          if (!cell || !shiftId) {
            patchState(store, { errorMessage: 'Vui long chon ca lam viec.' });
            return EMPTY;
          }

          patchState(store, { saving: true, errorMessage: null, successMessage: null });

          return workScheduleService
            .assignShift({
              employeeId: cell.employeeId,
              shiftId,
              workDate: cell.workDate,
              reason: store.reason(),
            })
            .pipe(
              tap({
                next: () => {
                  patchState(store, {
                    saving: false,
                    assignModalOpen: false,
                    selectedCell: null,
                    assignShiftId: '',
                    successMessage: 'Da cap nhat ca lam viec.',
                  });
                  reloadSchedules();
                },
                error: () =>
                  patchState(store, {
                    saving: false,
                    errorMessage: 'Khong the cap nhat ca lam viec.',
                  }),
              }),
              catchError(() => EMPTY)
            );
        })
      )
    );

    const bulkAssign = rxMethod<void>(
      pipe(
        switchMap(() => {
          const draft = store.bulkDraft();
          const employeeIds = draft.selectAll ? [] : store.selectedEmployeeIds();

          if (!draft.shiftId || !draft.startDate || !draft.endDate || (!draft.selectAll && employeeIds.length === 0)) {
            patchState(store, { errorMessage: 'Vui long chon nhan vien, ca va khoang ngay.' });
            return EMPTY;
          }

          patchState(store, { saving: true, errorMessage: null, successMessage: null });

          return workScheduleService
            .bulkAssignShifts({
              employeeIds,
              selectAll: draft.selectAll,
              shiftId: draft.shiftId,
              startDate: draft.startDate,
              endDate: draft.endDate,
              reason: store.reason(),
            })
            .pipe(
              tap({
                next: () => {
                  patchState(store, {
                    saving: false,
                    bulkModalOpen: false,
                    bulkDraft: { ...EMPTY_BULK_DRAFT, startDate: store.query().weekStartDate, endDate: store.query().weekEndDate },
                    selectedEmployeeIds: draft.selectAll ? [] : store.selectedEmployeeIds(),
                    successMessage: 'Da gan ca hang loat.',
                  });
                  reloadSchedules();
                },
                error: () =>
                  patchState(store, {
                    saving: false,
                    errorMessage: 'Khong the gan ca hang loat.',
                  }),
              }),
              catchError(() => EMPTY)
            );
        })
      )
    );

    const copyWeek = rxMethod<void>(
      pipe(
        switchMap(() => {
          const draft = store.copyDraft();

          if (!draft.fromWeekStartDate || !draft.fromWeekEndDate || !draft.toWeekStartDate || !draft.toWeekEndDate) {
            patchState(store, { errorMessage: 'Vui long chon tuan nguon va tuan dich.' });
            return EMPTY;
          }

          patchState(store, { saving: true, errorMessage: null, successMessage: null });

          return workScheduleService.copyWeek({
            ...draft,
            reason: store.reason(),
          }).pipe(
            tap({
              next: () => {
                patchState(store, {
                  saving: false,
                  copyModalOpen: false,
                  successMessage: 'Da sao chep lich tuan.',
                });
                reloadSchedules();
              },
              error: () =>
                patchState(store, {
                  saving: false,
                  errorMessage: 'Khong the sao chep lich tuan.',
                }),
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    const saveShiftSettings = rxMethod<void>(
      pipe(
        switchMap(() => {
          const shifts = store.settingsDraft().shifts;

          patchState(store, { saving: true, errorMessage: null, successMessage: null });

          return workScheduleService.updateShifts(shifts).pipe(
            tap({
              next: updatedShifts => {
                patchState(store, {
                  shifts: updatedShifts,
                  saving: false,
                  settingsModalOpen: false,
                  settingsDraft: { shifts: [], newShift: null },
                  successMessage: 'Da cap nhat gio ca lam viec.',
                });
                reloadSchedules();
              },
              error: () =>
                patchState(store, {
                  saving: false,
                  errorMessage: 'Khong the cap nhat cau hinh ca.',
                }),
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    const createShift = rxMethod<void>(
      pipe(
        switchMap(() => {
          const newShift = store.settingsDraft().newShift;
          if (!newShift) return EMPTY;

          patchState(store, { saving: true, errorMessage: null, successMessage: null });

          return workScheduleService.createShift(newShift).pipe(
            tap({
              next: (createdShift) => {
                const currentShifts = store.shifts();
                patchState(store, {
                  shifts: [...currentShifts, createdShift],
                  saving: false,
                  settingsDraft: { 
                    ...store.settingsDraft(), 
                    shifts: [...store.settingsDraft().shifts, createdShift],
                    newShift: null 
                  },
                  successMessage: 'Đã tạo ca làm việc mới.',
                });
                reloadSchedules();
              },
              error: () =>
                patchState(store, {
                  saving: false,
                  errorMessage: 'Không thể tạo ca làm việc.',
                }),
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    return {
      loadWorkspace,
      assignShift,
      bulkAssign,
      copyWeek,
      saveShiftSettings,
      createShift,
      setKeyword(keyword: string): void {
        patchState(store, {
          query: {
            ...store.query(),
            keyword,
          },
        });
      },
      applyFilters(): void {
        patchState(store, {
          query: {
            ...store.query(),
            page: 0,
          },
        });
        loadWorkspace();
      },
      refresh(): void {
        loadWorkspace();
      },
      goToWeek(offset: number): void {
        const weekStartDate = formatDate(addWeeks(parseDate(store.query().weekStartDate), offset));

        patchState(store, {
          selectedEmployeeIds: [],
          query: {
            ...store.query(),
            weekStartDate,
            weekEndDate: getWeekEndDate(weekStartDate),
            page: 0,
          },
        });
        loadWorkspace();
      },
      goToCurrentWeek(): void {
        const weekStartDate = formatDate(getWeekStart(new Date()));

        patchState(store, {
          selectedEmployeeIds: [],
          query: {
            ...store.query(),
            weekStartDate,
            weekEndDate: getWeekEndDate(weekStartDate),
            page: 0,
          },
        });
        loadWorkspace();
      },
      goToPage(page: number): void {
        const normalizedPage = Math.max(0, Math.min(page, Math.max(store.totalPages() - 1, 0)));

        patchState(store, {
          query: {
            ...store.query(),
            page: normalizedPage,
          },
        });
        loadWorkspace();
      },
      toggleEmployee(employeeId: string): void {
        const selected = new Set(store.selectedEmployeeIds());

        if (selected.has(employeeId)) {
          selected.delete(employeeId);
        } else {
          selected.add(employeeId);
        }

        patchState(store, { selectedEmployeeIds: Array.from(selected) });
      },
      toggleAllVisible(): void {
        const visibleIds = store.employees().map(employee => employee.employeeId);
        const selected = new Set(store.selectedEmployeeIds());
        const allSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id));

        visibleIds.forEach(id => {
          if (allSelected) {
            selected.delete(id);
          } else {
            selected.add(id);
          }
        });

        patchState(store, { selectedEmployeeIds: Array.from(selected) });
      },
      openAssignModal(employee: EmployeeWeeklySchedule, workDate: string, shift: DailyShift | null): void {
        patchState(store, {
          selectedCell: {
            employeeId: employee.employeeId,
            employeeName: employee.employeeName,
            workDate,
            shift,
          },
          assignShiftId: shift?.shiftId ?? store.shifts().find(item => item.isDefault)?.id ?? store.shifts()[0]?.id ?? '',
          assignModalOpen: true,
        });
      },
      closeAssignModal(): void {
        if (store.saving()) {
          return;
        }

        patchState(store, {
          selectedCell: null,
          assignShiftId: '',
          reason: '',
          assignModalOpen: false,
        });
      },
      setReason(reason: string): void {
        patchState(store, { reason });
      },
      setAssignShift(shiftId: string): void {
        patchState(store, { assignShiftId: shiftId });
      },
      openBulkModal(): void {
        patchState(store, {
          bulkModalOpen: true,
          bulkDraft: {
            ...EMPTY_BULK_DRAFT,
            startDate: store.query().weekStartDate,
            endDate: store.query().weekEndDate,
            shiftId: store.shifts().find(item => item.isDefault)?.id ?? store.shifts()[0]?.id ?? '',
          },
        });
      },
      closeBulkModal(): void {
        if (store.saving()) {
          return;
        }

        patchState(store, { bulkModalOpen: false, reason: '' });
      },
      updateBulkDraft(patch: Partial<BulkAssignDraft>): void {
        patchState(store, {
          bulkDraft: {
            ...store.bulkDraft(),
            ...patch,
          },
        });
      },
      openCopyModal(): void {
        const previousWeekStart = formatDate(addWeeks(parseDate(store.query().weekStartDate), -1));

        patchState(store, {
          copyModalOpen: true,
          copyDraft: {
            fromWeekStartDate: previousWeekStart,
            fromWeekEndDate: getWeekEndDate(previousWeekStart),
            toWeekStartDate: store.query().weekStartDate,
            toWeekEndDate: store.query().weekEndDate,
          },
        });
      },
      closeCopyModal(): void {
        if (store.saving()) {
          return;
        }

        patchState(store, { copyModalOpen: false, reason: '' });
      },
      updateCopyDraft(patch: Partial<CopyWeekDraft>): void {
        patchState(store, {
          copyDraft: {
            ...store.copyDraft(),
            ...patch,
          },
        });
      },
      setCopyWeekStart(field: 'fromWeekStartDate' | 'toWeekStartDate', value: string): void {
        const endField = field === 'fromWeekStartDate' ? 'fromWeekEndDate' : 'toWeekEndDate';

        patchState(store, {
          copyDraft: {
            ...store.copyDraft(),
            [field]: value,
            [endField]: getWeekEndDate(value),
          },
        });
      },
      openSettingsModal(): void {
        patchState(store, {
          settingsModalOpen: true,
          settingsDraft: {
            shifts: store.shifts().map(shift => ({ ...shift })),
            newShift: null,
          },
        });
      },
      closeSettingsModal(): void {
        if (store.saving()) {
          return;
        }

        patchState(store, {
          settingsModalOpen: false,
          settingsDraft: { shifts: [], newShift: null },
        });
      },
      updateShiftDraft(shiftId: string, patch: Partial<Pick<Shift, 'startTime' | 'endTime'>>): void {
        patchState(store, {
          settingsDraft: {
            ...store.settingsDraft(),
            shifts: store.settingsDraft().shifts.map(shift =>
              shift.id === shiftId
                ? {
                    ...shift,
                    ...patch,
                  }
                : shift
            ),
          },
        });
      },
      addNewShiftDraft(): void {
        patchState(store, {
          settingsDraft: {
            ...store.settingsDraft(),
            newShift: {
              name: '',
              startTime: null,
              endTime: null,
              colorCode: '#4f46e5',
              isDefault: false,
              type: 'NORMAL',
            },
          },
        });
      },
      removeNewShiftDraft(): void {
        patchState(store, {
          settingsDraft: {
            ...store.settingsDraft(),
            newShift: null,
          },
        });
      },
      updateNewShiftDraft(patch: Partial<CreateShiftRequest>): void {
        const draft = store.settingsDraft();
        if (draft.newShift) {
          patchState(store, {
            settingsDraft: {
              ...draft,
              newShift: {
                ...draft.newShift,
                ...patch,
              },
            },
          });
        }
      },
      clearMessages(): void {
        patchState(store, { errorMessage: null, successMessage: null });
      },
    };
  })
);
