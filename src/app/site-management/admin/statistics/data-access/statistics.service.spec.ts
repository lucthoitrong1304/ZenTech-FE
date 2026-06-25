import '@angular/compiler';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../../../core/api/api.service';
import { environment } from '../../../../../environments/environment';
import { AdminStatisticsData, ApiResponse } from './statistics.models';
import { AdminStatisticsService } from './statistics.service';

describe('AdminStatisticsService', () => {
  beforeAll(() => {
    try {
      getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('already')) throw error;
    }
  });

  afterEach(() => TestBed.resetTestingModule());

  function createService(get: ReturnType<typeof vi.fn>): AdminStatisticsService {
    TestBed.configureTestingModule({
      providers: [
        AdminStatisticsService,
        { provide: ApiService, useValue: { get } },
      ],
    });
    return TestBed.inject(AdminStatisticsService);
  }

  it('requests a preset period', async () => {
    const response = statisticsResponse();
    const get = vi.fn(() => of(response));
    const service = createService(get);

    await expect(firstValueFrom(service.getStatistics('7D'))).resolves.toEqual(response);
    expect(get).toHaveBeenCalledWith(`${environment.apiBaseUrl}/admin/statistics?period=7D`);
  });

  it('encodes a custom date range', async () => {
    const response = statisticsResponse();
    const get = vi.fn(() => of(response));
    const service = createService(get);
    const from = '2026-06-01T00:00:00.000Z';
    const to = '2026-06-07T23:59:59.999Z';

    await firstValueFrom(service.getStatistics('CUSTOM', from, to));

    expect(get).toHaveBeenCalledWith(
      `${environment.apiBaseUrl}/admin/statistics?period=CUSTOM`
        + `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );
  });
});

function statisticsResponse(): ApiResponse<AdminStatisticsData> {
  return {
    success: true,
    message: null,
    data: {
      period: '7D',
      from: '2026-06-01T00:00:00Z',
      to: '2026-06-07T23:59:59Z',
      generatedAt: '2026-06-07T23:59:59Z',
      logsAvailable: true,
      partialData: false,
      totalErrors: 0,
      incidentsInPeriod: 0,
      ticketsCreated: 0,
      ticketsResolved: 0,
      ticketResolutionRate: 0,
      errorTrend: [],
      topApis: [],
      topServices: [],
      topAffectedUsers: [],
    },
  };
}
