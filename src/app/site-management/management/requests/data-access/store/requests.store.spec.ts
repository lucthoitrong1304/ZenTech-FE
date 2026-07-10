import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import { RequestsService } from '../services/requests.service';
import { RequestsStore } from './requests.store';

describe('RequestsStore', () => {
  afterEach(() => TestBed.resetTestingModule());

  function createStore(service: Partial<RequestsService>): InstanceType<typeof RequestsStore> {
    TestBed.configureTestingModule({
      providers: [
        RequestsStore,
        { provide: RequestsService, useValue: service },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    return TestBed.inject(RequestsStore);
  }

  it('loads request histories into named entity collections', () => {
    const store = createStore({
      getLeaveTypes: vi.fn(() => of({ success: true, data: [] })),
      getMyQuotas: vi.fn(() => of({ success: true, data: [] })),
      getMyLeaves: vi.fn(() => of({ success: true, data: [leave()] })),
      getMySwaps: vi.fn(() => of({ success: true, data: [swap()] })),
      getMyAdjustments: vi.fn(() => of({ success: true, data: [adjustment()] })),
      getColleagues: vi.fn(() => of({ success: true, data: { content: [] } })),
    });

    store.loadInitialData();

    expect(store.myLeaves()).toEqual([leave()]);
    expect(store.mySwaps()).toEqual([swap()]);
    expect(store.myAdjustments()).toEqual([adjustment()]);
  });

  it('exposes a typed error and clears submitting when a leave submission fails', () => {
    const store = createStore({ createLeave: vi.fn(() => throwError(() => ({ error: { message: 'Rejected' } }))) });

    store.submitLeave({ payload: { leaveTypeId: 'annual', startDate: '2026-07-10', endDate: '2026-07-10', startTime: null, endTime: null, shiftIds: [], reason: 'Reason' } });

    expect(store.submitting()).toBe(false);
    expect(store.error()).toEqual({ operation: 'submit-leave', message: 'Rejected' });
  });
});

function leave() { return { id: 'leave-1', startDate: '2026-07-10', endDate: '2026-07-10', startTime: null, endTime: null, leaveType: null, amount: 1, overQuota: false, quotaRemainingBeforeRequest: null, quotaRemainingAfterRequest: null, reason: 'Reason', status: 'PENDING' as const, requestedAt: '2026-07-10T00:00:00Z' }; }
function swap() { return { id: 'swap-1', requester: { fullName: 'A' }, targetEmployee: { fullName: 'B' }, workDate: '2026-07-10', shift: null, targetWorkDate: null, targetShift: null, type: 'COVER' as const, reason: 'Reason', status: 'PENDING' as const, requestedAt: '2026-07-10T00:00:00Z' }; }
function adjustment() { return { id: 'adjustment-1', workDate: '2026-07-10', type: 'FORGOT_CHECK_IN', proposedTime: '09:00:00', reason: 'Reason', status: 'PENDING' as const, requestedAt: '2026-07-10T00:00:00Z' }; }
