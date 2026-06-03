import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import {
  EmployeeWeeklySchedule,
  Shift,
  WorkSchedulePage,
} from '../models/work-schedule.models';
import { WorkScheduleService } from '../services/work-schedule.service';
import { WorkScheduleStore } from './work-schedule.store';

describe('WorkScheduleStore', () => {
  beforeAll(() => {
    try {
      getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Cannot set base providers')) {
        throw error;
      }
    }
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function configureStore(
    service: Partial<WorkScheduleService>
  ): InstanceType<typeof WorkScheduleStore> {
    TestBed.configureTestingModule({
      providers: [
        WorkScheduleStore,
        {
          provide: WorkScheduleService,
          useValue: service,
        },
      ],
    });

    return TestBed.inject(WorkScheduleStore);
  }

  it('loads shifts and weekly schedules', () => {
    const shift = createShift();
    const employee = createEmployee();
    const getShifts = vi.fn(() => of([shift]));
    const getWeeklySchedules = vi.fn(() => of(createPage([employee])));
    const store = configureStore({ getShifts, getWeeklySchedules });

    store.loadWorkspace();

    expect(getShifts).toHaveBeenCalled();
    expect(getWeeklySchedules).toHaveBeenCalledWith(store.query());
    expect(store.shifts()).toEqual([shift]);
    expect(store.employees()).toEqual([employee]);
    expect(store.totalElements()).toBe(1);
    expect(store.weekDates()).toHaveLength(7);
  });

  it('opens a cell with the current shift preselected and assigns a replacement', () => {
    const shift = createShift();
    const employee = createEmployee();
    const assignShift = vi.fn(() => of(undefined));
    const getWeeklySchedules = vi.fn(() => of(createPage([employee])));
    const store = configureStore({
      getShifts: vi.fn(() => of([shift])),
      getWeeklySchedules,
      assignShift,
    });

    store.loadWorkspace();
    store.openAssignModal(employee, '2026-05-25', employee.shifts[0]);
    store.assignShift();

    expect(assignShift).toHaveBeenCalledWith({
      employeeId: 'employee-1',
      shiftId: 'shift-1',
      workDate: '2026-05-25',
    });
    expect(store.assignModalOpen()).toBe(false);
    expect(store.successMessage()).toBe('Da cap nhat ca lam viec.');
  });

  it('sends selectAll for bulk assignment without employee ids', () => {
    const bulkAssignShifts = vi.fn(() => of(undefined));
    const store = configureStore({
      getShifts: vi.fn(() => of([createShift()])),
      getWeeklySchedules: vi.fn(() => of(createPage([createEmployee()]))),
      bulkAssignShifts,
    });

    store.loadWorkspace();
    store.openBulkModal();
    store.updateBulkDraft({ selectAll: true, shiftId: 'shift-1' });
    store.bulkAssign();

    expect(bulkAssignShifts).toHaveBeenCalledWith({
      employeeIds: [],
      selectAll: true,
      shiftId: 'shift-1',
      startDate: store.query().weekStartDate,
      endDate: store.query().weekEndDate,
    });
  });

  it('keeps the settings modal open when shift update fails', () => {
    const store = configureStore({
      getShifts: vi.fn(() => of([createShift()])),
      getWeeklySchedules: vi.fn(() => of(createPage([createEmployee()]))),
      updateShifts: vi.fn(() => throwError(() => new Error('failed'))),
    });

    store.loadWorkspace();
    store.openSettingsModal();
    store.updateShiftDraft('shift-1', { startTime: '09:00:00' });
    store.saveShiftSettings();

    expect(store.saving()).toBe(false);
    expect(store.settingsModalOpen()).toBe(true);
    expect(store.errorMessage()).toBe('Khong the cap nhat cau hinh ca.');
  });
});

function createShift(): Shift {
  return {
    id: 'shift-1',
    name: 'Ca sang',
    startTime: '08:00:00',
    endTime: '12:00:00',
    colorCode: '#4f46e5',
    isDefault: true,
    type: 'NORMAL',
  };
}

function createEmployee(): EmployeeWeeklySchedule {
  return {
    employeeId: 'employee-1',
    employeeName: 'Nguyen Van A',
    shifts: [
      {
        shiftId: 'shift-1',
        shiftName: 'Ca sang',
        colorCode: '#4f46e5',
        workDate: '2026-05-25',
        startTime: '08:00:00',
        endTime: '12:00:00',
        shiftType: 'NORMAL',
      },
    ],
  };
}

function createPage(employees: EmployeeWeeklySchedule[]): WorkSchedulePage {
  return {
    employees,
    page: 0,
    size: 10,
    totalElements: employees.length,
    totalPages: employees.length > 0 ? 1 : 0,
    last: true,
  };
}
