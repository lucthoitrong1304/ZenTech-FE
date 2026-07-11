import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '@env/environment';
import { ApiService } from '@/core/api/api.service';
import { CreateLeaveRequest } from '@/site-management/management/requests/data-access/models/requests.models';
import { RequestsService } from '@/site-management/management/requests/data-access/services/requests.service';

describe('RequestsService', () => {
  afterEach(() => TestBed.resetTestingModule());

  function createService(api: object): RequestsService {
    TestBed.configureTestingModule({ providers: [RequestsService, { provide: ApiService, useValue: api }] });
    return TestBed.inject(RequestsService);
  }

  it('uses typed schedule query parameters', async () => {
    const get = vi.fn(() => of({ success: true, data: [] }));
    const service = createService({ get });

    await firstValueFrom(service.getColleagueShifts('employee-1', '2026-07-10'));

    expect(get).toHaveBeenCalledWith(`${environment.apiBaseUrl}/shifts/schedules`, {
      params: { startDate: '2026-07-10', endDate: '2026-07-10', employeeId: 'employee-1' },
    });
  });

  it('posts leave payload and sends cancellation to the feature endpoint', async () => {
    const post = vi.fn(() => of({ success: true, data: { id: 'leave-1' } }));
    const service = createService({ post });
    const payload: CreateLeaveRequest = {
      leaveTypeId: 'annual', startDate: '2026-07-10', endDate: '2026-07-10', startTime: null, endTime: null, shiftIds: ['shift-1'], reason: 'Personal',
    };

    await firstValueFrom(service.createLeave(payload));
    await firstValueFrom(service.cancelLeave('leave-1'));

    expect(post).toHaveBeenNthCalledWith(1, `${environment.apiBaseUrl}/leaves`, payload);
    expect(post).toHaveBeenNthCalledWith(2, `${environment.apiBaseUrl}/leaves/leave-1/cancel`, null);
  });
});
