/* @vitest-environment jsdom */
import '@angular/compiler';
import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ErrorStateService } from '../errors/error-state.service';
import { ClientLogEventType } from '../logging/client-log.model';
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

  it('logs 403 as warn and does not change roles or leave management', async () => {
    const navigate = vi.fn();
    const clear = vi.fn();
    const clientLogService = { warn: vi.fn(), error: vi.fn(), info: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { url: '/management/orders', navigate } },
        { provide: ErrorStateService, useValue: { setError: vi.fn() } },
        { provide: AuthRefreshService, useValue: { refresh: vi.fn() } },
        { provide: AuthStorageService, useValue: { clear, getRefreshToken: vi.fn() } },
        { provide: ClientLogService, useValue: clientLogService },
      ],
    });
    const request = new HttpRequest('GET', '/api/management/orders');
    const forbidden = new HttpErrorResponse({ status: 403, statusText: 'Forbidden' });

    const result = TestBed.runInInjectionContext(() =>
      firstValueFrom(errorInterceptor(request, () => throwError(() => forbidden))),
    );

    await expect(result).rejects.toBe(forbidden);
    expect(clientLogService.warn).toHaveBeenCalledWith(
      ClientLogEventType.HttpRequestFailed,
      expect.any(String),
      expect.objectContaining({ statusCode: 403 }),
    );
    expect(clientLogService.error).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });

  it('logs only AuthTokenExpired for 401 responses', async () => {
    const navigate = vi.fn();
    const clear = vi.fn();
    const clientLogService = { warn: vi.fn(), error: vi.fn(), info: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { url: '/admin/dashboard', navigate } },
        { provide: ErrorStateService, useValue: { setError: vi.fn() } },
        { provide: AuthRefreshService, useValue: { refresh: vi.fn() } },
        { provide: AuthStorageService, useValue: { clear, getRefreshToken: vi.fn(() => null) } },
        { provide: ClientLogService, useValue: clientLogService },
      ],
    });
    const request = new HttpRequest('GET', '/api/admin/dashboard');
    const unauthorized = new HttpErrorResponse({ status: 401, statusText: 'OK' });

    const result = TestBed.runInInjectionContext(() =>
      firstValueFrom(errorInterceptor(request, () => throwError(() => unauthorized))),
    );

    await expect(result).rejects.toBeInstanceOf(Error);
    expect(clientLogService.warn).toHaveBeenCalledTimes(1);
    expect(clientLogService.warn).toHaveBeenCalledWith(
      ClientLogEventType.AuthTokenExpired,
      expect.any(String),
      expect.objectContaining({ statusCode: 401 }),
    );
    expect(clientLogService.warn).not.toHaveBeenCalledWith(
      ClientLogEventType.HttpRequestFailed,
      expect.any(String),
      expect.any(Object),
    );
    expect(clientLogService.error).not.toHaveBeenCalled();
  });

  it('does not expire the session when refresh succeeds but the retried request is still 401', async () => {
    const navigate = vi.fn();
    const clear = vi.fn();
    const setSession = vi.fn();
    const refreshResponse = {
      accessToken: 'fresh-access-token',
      refreshToken: 'fresh-refresh-token',
      accountId: 'account-1',
      profileId: 'profile-1',
      email: 'manager@zentech.vn',
      fullName: 'Manager',
      roles: ['ROLE_MANAGER'],
    };
    const refresh = vi.fn(() => of(refreshResponse));
    const clientLogService = { warn: vi.fn(), error: vi.fn(), info: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { url: '/management/dashboard', navigate } },
        { provide: ErrorStateService, useValue: { setError: vi.fn() } },
        { provide: AuthRefreshService, useValue: { refresh } },
        {
          provide: AuthStorageService,
          useValue: {
            clear,
            setSession,
            getRefreshToken: vi.fn(() => 'valid-refresh-token'),
          },
        },
        { provide: ClientLogService, useValue: clientLogService },
      ],
    });
    const request = new HttpRequest('GET', '/api/management/dashboard');
    const initialUnauthorized = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
    const retryUnauthorized = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
    const next = vi
      .fn()
      .mockReturnValueOnce(throwError(() => initialUnauthorized))
      .mockReturnValueOnce(throwError(() => retryUnauthorized));

    const result = TestBed.runInInjectionContext(() =>
      firstValueFrom(errorInterceptor(request, next)),
    );

    await expect(result).rejects.toBe(retryUnauthorized);
    expect(refresh).toHaveBeenCalledWith('valid-refresh-token');
    expect(setSession).toHaveBeenCalledWith(refreshResponse);
    expect(next).toHaveBeenCalledTimes(2);
    expect(clear).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('uses response body message before statusText for HTTP failure reason', async () => {
    const clientLogService = { warn: vi.fn(), error: vi.fn(), info: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { url: '/admin/dashboard', navigate: vi.fn() } },
        { provide: ErrorStateService, useValue: { setError: vi.fn() } },
        { provide: AuthRefreshService, useValue: { refresh: vi.fn() } },
        { provide: AuthStorageService, useValue: { clear: vi.fn(), getRefreshToken: vi.fn() } },
        { provide: ClientLogService, useValue: clientLogService },
      ],
    });
    const request = new HttpRequest('GET', '/api/admin/dashboard');
    const forbidden = new HttpErrorResponse({
      status: 403,
      statusText: 'OK',
      error: { message: 'Full authentication is required to access this resource' },
    });

    const result = TestBed.runInInjectionContext(() =>
      firstValueFrom(errorInterceptor(request, () => throwError(() => forbidden))),
    );

    await expect(result).rejects.toBe(forbidden);
    expect(clientLogService.warn).toHaveBeenCalledWith(
      ClientLogEventType.HttpRequestFailed,
      expect.any(String),
      expect.objectContaining({ reason: 'Full authentication is required to access this resource' }),
    );
  });

  it('falls back to status reason when HTTP failure has no useful body', async () => {
    const clientLogService = { warn: vi.fn(), error: vi.fn(), info: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { url: '/admin/dashboard', navigate: vi.fn() } },
        { provide: ErrorStateService, useValue: { setError: vi.fn() } },
        { provide: AuthRefreshService, useValue: { refresh: vi.fn() } },
        { provide: AuthStorageService, useValue: { clear: vi.fn(), getRefreshToken: vi.fn() } },
        { provide: ClientLogService, useValue: clientLogService },
      ],
    });
    const request = new HttpRequest('GET', '/api/missing');
    const notFound = new HttpErrorResponse({ status: 404, statusText: 'OK' });

    const result = TestBed.runInInjectionContext(() =>
      firstValueFrom(errorInterceptor(request, () => throwError(() => notFound))),
    );

    await expect(result).rejects.toBe(notFound);
    expect(clientLogService.warn).toHaveBeenCalledWith(
      ClientLogEventType.HttpRequestFailed,
      expect.any(String),
      expect.objectContaining({ reason: 'Not Found' }),
    );
  });
});

function isTestEnvironmentAlreadyInitialized(error: Error): boolean {
  return (
    error.message.includes('already been initialized') ||
    error.message.includes('already been called')
  );
}
