import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, forkJoin, pipe, switchMap, tap } from 'rxjs';
import {
  AttendanceGeoPoint,
  AttendanceLocationPolicy,
  AttendanceLocationShapeType,
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
import {
  addWeeks,
  formatDate,
  getWeekDates,
  getWeekEndDate,
  getWeekStart,
  parseDate,
} from './work-schedule-date.utils';

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

const DEFAULT_LOCATION_POLICY: AttendanceLocationPolicy = {
  id: null,
  enabled: false,
  shapeType: 'CIRCLE',
  centerLatitude: 10.762622,
  centerLongitude: 106.660172,
  radiusMeters: 100,
  polygonPoints: [],
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
  settingsTab: 'shifts' | 'location';
  settingsDraft: ShiftSettingsDraft;
  locationPolicy: AttendanceLocationPolicy;
  locationPolicyDraft: AttendanceLocationPolicy;
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
  settingsTab: 'shifts',
  settingsDraft: { shifts: [], newShift: null },
  locationPolicy: DEFAULT_LOCATION_POLICY,
  locationPolicyDraft: DEFAULT_LOCATION_POLICY,
  reason: '',
  errorMessage: null,
  successMessage: null,
};

export const WorkScheduleStore = signalStore(
  withState<WorkScheduleState>(INITIAL_STATE),
  withComputed(
    ({
      query,
      employees,
      shifts,
      totalElements,
      totalPages,
      selectedEmployeeIds,
      saving,
      selectedCell,
      assignShiftId,
      bulkDraft,
      locationPolicyDraft,
    }) => ({
      weekDates: computed(() => getWeekDates(query().weekStartDate)),
      pageStart: computed(() => (totalElements() === 0 ? 0 : query().page * query().size + 1)),
      pageEnd: computed(() => Math.min((query().page + 1) * query().size, totalElements())),
      canGoPrevious: computed(() => query().page > 0),
      canGoNext: computed(() => query().page + 1 < totalPages()),
      hasEmployees: computed(() => employees().length > 0),
      hasShifts: computed(() => shifts().length > 0),
      allVisibleSelected: computed(() => {
        const ids = employees().map((employee) => employee.employeeId);

        return ids.length > 0 && ids.every((id) => selectedEmployeeIds().includes(id));
      }),
      selectedCount: computed(() => selectedEmployeeIds().length),
      canSubmitAssign: computed(() => !!selectedCell() && !!assignShiftId() && !saving()),
      canSubmitBulk: computed(() => {
        const draft = bulkDraft();

        return (
          !!draft.shiftId &&
          !!draft.startDate &&
          !!draft.endDate &&
          (draft.selectAll || selectedEmployeeIds().length > 0) &&
          !saving()
        );
      }),
      canSaveLocationPolicy: computed(() => {
        const policy = locationPolicyDraft();
        if (!policy.enabled) {
          return !saving();
        }
        if (policy.shapeType === 'CIRCLE') {
          return (
            isValidLatitude(policy.centerLatitude) &&
            isValidLongitude(policy.centerLongitude) &&
            !!policy.radiusMeters &&
            policy.radiusMeters > 0 &&
            !saving()
          );
        }
        return policy.polygonPoints.length >= 3 && !saving();
      }),
    }),
  ),
  withMethods((store, workScheduleService = inject(WorkScheduleService)) => {
    const applyPage = (page: {
      employees: EmployeeWeeklySchedule[];
      page: number;
      size: number;
      totalElements: number;
      totalPages: number;
      last: boolean;
    }): void => {
      const selectedCell = store.selectedCell();
      const refreshedCell = selectedCell ? refreshSelectedCell(selectedCell, page.employees) : null;

      patchState(store, {
        employees: page.employees,
        totalElements: page.totalElements,
        totalPages: page.totalPages,
        last: page.last,
        selectedCell: refreshedCell,
        assignShiftId: refreshedCell
          ? getFirstAssignableShiftId(store.shifts(), refreshedCell.shifts)
          : store.assignShiftId(),
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
            locationPolicy: workScheduleService.getLocationPolicy(),
            page: workScheduleService.getWeeklySchedules(store.query()),
          }).pipe(
            tap({
              next: (result) => {
                applyPage(result.page);
                patchState(store, {
                  shifts: result.shifts,
                  locationPolicy: result.locationPolicy,
                  locationPolicyDraft: cloneLocationPolicy(result.locationPolicy),
                });
              },
              error: () =>
                patchState(store, {
                  employees: [],
                  shifts: [],
                  totalElements: 0,
                  totalPages: 0,
                  last: true,
                  loading: false,
                  errorMessage: 'Không thể tải lịch làm việc.',
                }),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );

    const reloadSchedules = (): void => {
      patchState(store, { loading: true, errorMessage: null });
      workScheduleService
        .getWeeklySchedules(store.query())
        .pipe(
          tap({
            next: (page) => applyPage(page),
            error: () =>
              patchState(store, {
                loading: false,
                errorMessage: 'Không thể tải lại lịch làm việc.',
              }),
          }),
          catchError(() => EMPTY),
        )
        .subscribe();
    };

    const assignShift = rxMethod<void>(
      pipe(
        switchMap(() => {
          const cell = store.selectedCell();
          const shiftId = store.assignShiftId();

          if (!cell || !shiftId) {
            patchState(store, { errorMessage: 'Vui lòng chọn ca làm việc.' });
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
                    assignShiftId: '',
                    successMessage: 'Đã thêm ca làm việc.',
                  });
                  reloadSchedules();
                },
                error: () =>
                  patchState(store, {
                    saving: false,
                    errorMessage: 'Không thể cập nhật ca làm việc.',
                  }),
              }),
              catchError(() => EMPTY),
            );
        }),
      ),
    );

    const deleteScheduleAssignment = rxMethod<string>(
      pipe(
        switchMap((employeeShiftId) => {
          if (!employeeShiftId) {
            return EMPTY;
          }

          patchState(store, { saving: true, errorMessage: null, successMessage: null });

          return workScheduleService.deleteScheduleAssignment(employeeShiftId, store.reason()).pipe(
            tap({
              next: () => {
                patchState(store, {
                  saving: false,
                  assignModalOpen: false,
                  selectedCell: null,
                  assignShiftId: '',
                  successMessage: 'Đã xóa ca khỏi ngày làm việc.',
                });
                reloadSchedules();
              },
              error: () =>
                patchState(store, {
                  saving: false,
                  errorMessage: 'Không thể xóa ca khỏi ngày làm việc.',
                }),
            }),
            catchError(() => EMPTY),
          );
        }),
      ),
    );

    const bulkAssign = rxMethod<void>(
      pipe(
        switchMap(() => {
          const draft = store.bulkDraft();
          const employeeIds = draft.selectAll ? [] : store.selectedEmployeeIds();

          if (
            !draft.shiftId ||
            !draft.startDate ||
            !draft.endDate ||
            (!draft.selectAll && employeeIds.length === 0)
          ) {
            patchState(store, { errorMessage: 'Vui lòng chọn nhân viên, ca và khoảng ngày.' });
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
                    bulkDraft: {
                      ...EMPTY_BULK_DRAFT,
                      startDate: store.query().weekStartDate,
                      endDate: store.query().weekEndDate,
                    },
                    selectedEmployeeIds: draft.selectAll ? [] : store.selectedEmployeeIds(),
                    successMessage: 'Đã gán ca hàng loạt.',
                  });
                  reloadSchedules();
                },
                error: () =>
                  patchState(store, {
                    saving: false,
                    errorMessage: 'Không thể gán ca hàng loạt.',
                  }),
              }),
              catchError(() => EMPTY),
            );
        }),
      ),
    );

    const copyWeek = rxMethod<void>(
      pipe(
        switchMap(() => {
          const draft = store.copyDraft();

          if (
            !draft.fromWeekStartDate ||
            !draft.fromWeekEndDate ||
            !draft.toWeekStartDate ||
            !draft.toWeekEndDate
          ) {
            patchState(store, { errorMessage: 'Vui lòng chọn tuần nguồn và tuần đích.' });
            return EMPTY;
          }

          patchState(store, { saving: true, errorMessage: null, successMessage: null });

          return workScheduleService
            .copyWeek({
              ...draft,
              reason: store.reason(),
            })
            .pipe(
              tap({
                next: () => {
                  patchState(store, {
                    saving: false,
                    copyModalOpen: false,
                    successMessage: 'Đã sao chép lịch tuần.',
                  });
                  reloadSchedules();
                },
                error: () =>
                  patchState(store, {
                    saving: false,
                    errorMessage: 'Không thể sao chép lịch tuần.',
                  }),
              }),
              catchError(() => EMPTY),
            );
        }),
      ),
    );

    const saveShiftSettings = rxMethod<void>(
      pipe(
        switchMap(() => {
          const shifts = store.settingsDraft().shifts;

          patchState(store, { saving: true, errorMessage: null, successMessage: null });

          return workScheduleService.updateShifts(shifts).pipe(
            tap({
              next: (updatedShifts) => {
                patchState(store, {
                  shifts: updatedShifts,
                  saving: false,
                  settingsModalOpen: false,
                  settingsDraft: { shifts: [], newShift: null },
                  successMessage: 'Đã cập nhật giờ ca làm việc.',
                });
                reloadSchedules();
              },
              error: () =>
                patchState(store, {
                  saving: false,
                  errorMessage: 'Không thể cập nhật cấu hình ca.',
                }),
            }),
            catchError(() => EMPTY),
          );
        }),
      ),
    );

    const saveLocationPolicy = rxMethod<void>(
      pipe(
        switchMap(() => {
          const policy = normalizeLocationPolicyDraft(store.locationPolicyDraft());

          patchState(store, { saving: true, errorMessage: null, successMessage: null });

          return workScheduleService.updateLocationPolicy(policy).pipe(
            tap({
              next: (updatedPolicy) => {
                patchState(store, {
                  locationPolicy: updatedPolicy,
                  locationPolicyDraft: cloneLocationPolicy(updatedPolicy),
                  saving: false,
                  successMessage: 'Đã cập nhật phạm vi check-in.',
                });
              },
              error: () =>
                patchState(store, {
                  saving: false,
                  errorMessage: 'Không thể cập nhật phạm vi check-in.',
                }),
            }),
            catchError(() => EMPTY),
          );
        }),
      ),
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
                    newShift: null,
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
            catchError(() => EMPTY),
          );
        }),
      ),
    );

    return {
      loadWorkspace,
      assignShift,
      deleteScheduleAssignment,
      bulkAssign,
      copyWeek,
      saveShiftSettings,
      saveLocationPolicy,
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
        const visibleIds = store.employees().map((employee) => employee.employeeId);
        const selected = new Set(store.selectedEmployeeIds());
        const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

        visibleIds.forEach((id) => {
          if (allSelected) {
            selected.delete(id);
          } else {
            selected.add(id);
          }
        });

        patchState(store, { selectedEmployeeIds: Array.from(selected) });
      },
      openAssignModal(
        employee: EmployeeWeeklySchedule,
        workDate: string,
        shifts: DailyShift[],
      ): void {
        patchState(store, {
          selectedCell: {
            employeeId: employee.employeeId,
            employeeName: employee.employeeName,
            workDate,
            shifts,
          },
          assignShiftId: getFirstAssignableShiftId(store.shifts(), shifts),
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
            shiftId:
              store.shifts().find((item) => item.isDefault)?.id ?? store.shifts()[0]?.id ?? '',
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
          settingsTab: 'shifts',
          settingsDraft: {
            shifts: store.shifts().map((shift) => ({ ...shift })),
            newShift: null,
          },
          locationPolicyDraft: cloneLocationPolicy(store.locationPolicy()),
        });
      },
      closeSettingsModal(): void {
        if (store.saving()) {
          return;
        }

        patchState(store, {
          settingsModalOpen: false,
          settingsTab: 'shifts',
          settingsDraft: { shifts: [], newShift: null },
          locationPolicyDraft: cloneLocationPolicy(store.locationPolicy()),
        });
      },
      setSettingsTab(tab: 'shifts' | 'location'): void {
        patchState(store, { settingsTab: tab });
      },
      updateShiftDraft(
        shiftId: string,
        patch: Partial<Pick<Shift,
          | 'startTime'
          | 'endTime'
          | 'earlyCheckInMinutes'
          | 'lateCheckOutMinutes'
          | 'onTimeCheckInStartMinutes'
          | 'onTimeCheckInEndMinutes'
          | 'onTimeCheckOutStartMinutes'
          | 'onTimeCheckOutEndMinutes'
        >>,
      ): void {
        patchState(store, {
          settingsDraft: {
            ...store.settingsDraft(),
            shifts: store.settingsDraft().shifts.map((shift) =>
              shift.id === shiftId
                ? {
                    ...shift,
                    ...patch,
                  }
                : shift,
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
                earlyCheckInMinutes: 30,
                lateCheckOutMinutes: 60,
                onTimeCheckInStartMinutes: 15,
                onTimeCheckInEndMinutes: 5,
                onTimeCheckOutStartMinutes: 5,
                onTimeCheckOutEndMinutes: 15,
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
      updateLocationPolicyDraft(patch: Partial<AttendanceLocationPolicy>): void {
        patchState(store, {
          locationPolicyDraft: {
            ...store.locationPolicyDraft(),
            ...patch,
          },
        });
      },
      setLocationShapeType(shapeType: AttendanceLocationShapeType): void {
        const current = store.locationPolicyDraft();
        patchState(store, {
          locationPolicyDraft: {
            ...current,
            shapeType,
          },
        });
      },
      setCircleCenter(point: AttendanceGeoPoint): void {
        patchState(store, {
          locationPolicyDraft: {
            ...store.locationPolicyDraft(),
            centerLatitude: point.lat,
            centerLongitude: point.lng,
          },
        });
      },
      setCircleCoordinate(field: 'centerLatitude' | 'centerLongitude', value: number | null): void {
        patchState(store, {
          locationPolicyDraft: {
            ...store.locationPolicyDraft(),
            [field]: value,
          },
        });
      },
      setCircleRadius(radiusMeters: number): void {
        patchState(store, {
          locationPolicyDraft: {
            ...store.locationPolicyDraft(),
            radiusMeters: Math.max(1, radiusMeters),
          },
        });
      },
      addPolygonPoint(point: AttendanceGeoPoint): void {
        patchState(store, {
          locationPolicyDraft: {
            ...store.locationPolicyDraft(),
            polygonPoints: [...store.locationPolicyDraft().polygonPoints, point],
          },
        });
      },
      undoPolygonPoint(): void {
        patchState(store, {
          locationPolicyDraft: {
            ...store.locationPolicyDraft(),
            polygonPoints: store.locationPolicyDraft().polygonPoints.slice(0, -1),
          },
        });
      },
      clearPolygonPoints(): void {
        patchState(store, {
          locationPolicyDraft: {
            ...store.locationPolicyDraft(),
            polygonPoints: [],
          },
        });
      },
      clearMessages(): void {
        patchState(store, { errorMessage: null, successMessage: null });
      },
    };
  }),
);

function cloneLocationPolicy(policy: AttendanceLocationPolicy): AttendanceLocationPolicy {
  return {
    ...policy,
    polygonPoints: policy.polygonPoints.map((point) => ({ ...point })),
  };
}

function normalizeLocationPolicyDraft(policy: AttendanceLocationPolicy): AttendanceLocationPolicy {
  const normalized = cloneLocationPolicy(policy);
  normalized.radiusMeters = normalized.radiusMeters ?? 100;
  normalized.polygonPoints = normalized.polygonPoints.filter(
    (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
  );

  if (normalized.shapeType === 'CIRCLE') {
    normalized.polygonPoints = [];
  }

  return normalized;
}

function getFirstAssignableShiftId(shifts: Shift[], assignedShifts: DailyShift[]): string {
  const assignedShiftIds = new Set(assignedShifts.map((shift) => shift.shiftId));
  const availableShifts = shifts.filter((shift) => !assignedShiftIds.has(shift.id));

  return (
    availableShifts.find((shift) => shift.isDefault)?.id ??
    availableShifts[0]?.id ??
    ''
  );
}

function refreshSelectedCell(
  selectedCell: SelectedScheduleCell,
  employees: EmployeeWeeklySchedule[],
): SelectedScheduleCell | null {
  const employee = employees.find((item) => item.employeeId === selectedCell.employeeId);
  if (!employee) {
    return selectedCell;
  }

  const dayShifts = employee.shifts
    .filter((shift) => shift.workDate === selectedCell.workDate)
    .sort((first, second) => (first.startTime ?? '').localeCompare(second.startTime ?? ''));

  return {
    ...selectedCell,
    shifts: dayShifts,
  };
}

function isValidLatitude(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= -180 && value <= 180;
}
