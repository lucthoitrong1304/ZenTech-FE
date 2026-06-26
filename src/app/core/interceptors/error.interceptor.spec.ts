import '@angular/compiler';
import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Router } from '@angular/router';
import { firstValueFrom, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ErrorStateService } from '../errors/error-state.service';
import { ClientLogService } from '../logging/client-log.service';
import { AuthRefreshService } from '../services/auth-refresh.service';
import { AuthStorageService } from '../services/auth-storage.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  beforeAll(() => {
    try {
      getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch (error) {
      if (!(error instanceof Error) || !isTestEnvironmentAlreadyInitialized(error)) {
        throw error;
      }
    }
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('does not change roles or leave management when an API returns 403', async () => {
    const navigate = vi.fn();
    const clear = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { url: '/management/orders', navigate } },
        { provide: ErrorStateService, useValue: { setError: vi.fn() } },
        { provide: AuthRefreshService, useValue: { refresh: vi.fn() } },
        { provide: AuthStorageService, useValue: { clear, getRefreshToken: vi.fn() } },
        {
          provide: ClientLogService,
          useValue: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
        },
      ],
    });
    const request = new HttpRequest('GET', '/api/management/orders');
    const forbidden = new HttpErrorResponse({ status: 403, statusText: 'Forbidden' });

    const result = TestBed.runInInjectionContext(() =>
      firstValueFrom(errorInterceptor(request, () => throwError(() => forbidden))),
    );

    await expect(result).rejects.toBe(forbidden);
    expect(navigate).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });
});

function isTestEnvironmentAlreadyInitialized(error: Error): boolean {
  return (
    error.message.includes('already been initialized') ||
    error.message.includes('already been called')
  );
}
