import '@angular/compiler';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ConfirmService } from '../../../../shared/components/confirm/confirm.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AttendanceAdjustment, EmployeeDirectoryEntry, LeaveQuota, LeaveRequest, LeaveType, ShiftDto, ShiftSwapRequest } from '../../requests/data-access/models/requests.models';
import { RequestsStore } from '../../requests/data-access/store/requests.store';
import { RequestsComponent } from './requests.component';

describe('RequestsComponent', () => {
  let fixture: ComponentFixture<RequestsComponent>;
  let store: ReturnType<typeof createStore>;

  beforeEach(async () => {
    store = createStore();
    await TestBed.configureTestingModule({
      imports: [RequestsComponent],
      providers: [
        { provide: RequestsStore, useValue: store },
        { provide: ToastService, useValue: { error: vi.fn() } },
        { provide: ConfirmService, useValue: { open: vi.fn(() => of(true)) } },
      ],
    })
      .overrideComponent(RequestsComponent, { set: { template: '', providers: [{ provide: RequestsStore, useValue: store }] } })
      .compileComponents();
    fixture = TestBed.createComponent(RequestsComponent);
  });

  it('loads feature data on initialization', () => {
    fixture.componentInstance.ngOnInit();
    expect(store.loadInitialData).toHaveBeenCalledOnce();
  });

  it('sends validated leave payload to the store', () => {
    store.leaveTypes.set([{ id: 'annual', code: 'NGHI', name: 'Annual', description: null, unit: 'DAY', active: true, systemDefault: false, sortOrder: 1 }]);
    const component = fixture.componentInstance;
    component.leaveTypeId.set('annual');
    component.startDate.set('2026-07-10');
    component.endDate.set('2026-07-10');
    component.reason.set('Personal');

    component.submitLeave();

    expect(store.submitLeave).toHaveBeenCalledWith({
      payload: { leaveTypeId: 'annual', startDate: '2026-07-10', endDate: '2026-07-10', startTime: null, endTime: null, shiftIds: [], reason: 'Personal' },
      date: '2026-07-10',
    });
  });
});

function createStore() {
  return {
    submitting: signal(false), leaveTypes: signal<LeaveType[]>([]), quotas: signal<LeaveQuota[]>([]), myDailyShifts: signal<ShiftDto[]>([]), mySwapShifts: signal<ShiftDto[]>([]), colleagueShifts: signal<ShiftDto[]>([]), colleagues: signal<EmployeeDirectoryEntry[]>([]), myLeaves: signal<LeaveRequest[]>([]), mySwaps: signal<ShiftSwapRequest[]>([]), myAdjustments: signal<AttendanceAdjustment[]>([]), lastSuccess: signal(null),
    loadInitialData: vi.fn(), loadDailyShifts: vi.fn(), loadSwapShifts: vi.fn(), loadColleagueShifts: vi.fn(), submitLeave: vi.fn(), submitSwap: vi.fn(), submitAdjustment: vi.fn(), cancelLeave: vi.fn(), cancelSwap: vi.fn(), cancelAdjustment: vi.fn(), clearDailyShifts: vi.fn(), clearSwapShifts: vi.fn(), clearColleagueShifts: vi.fn(), clearSuccess: vi.fn(),
  };
}
