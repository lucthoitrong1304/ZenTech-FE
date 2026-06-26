import '@angular/compiler';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../api/api.service';
import { AuthSessionSource } from './auth-storage.service';
import { AuthRefreshService } from './auth-refresh.service';

describe('AuthRefreshService', () => {
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

  it('shares one in-flight refresh request for the same refresh token', async () => {
    const response$ = new Subject<AuthSessionSource>();
    const post = vi.fn(() => response$.asObservable());
    TestBed.configureTestingModule({
      providers: [AuthRefreshService, { provide: ApiService, useValue: { post } }],
    });
    const service = TestBed.inject(AuthRefreshService);

    const first = firstValueFrom(service.refresh('refresh-token'));
    const second = firstValueFrom(service.refresh('refresh-token'));

    expect(post).toHaveBeenCalledTimes(1);

    const response = createSession('new-access', 'new-refresh');
    response$.next(response);
    response$.complete();

    await expect(first).resolves.toEqual(response);
    await expect(second).resolves.toEqual(response);
  });

  it('allows a new refresh request after the previous request completes', async () => {
    const post = vi.fn(() => {
      const response$ = new Subject<AuthSessionSource>();
      queueMicrotask(() => {
        response$.next(createSession('access', 'rotated-refresh'));
        response$.complete();
      });
      return response$.asObservable();
    });
    TestBed.configureTestingModule({
      providers: [AuthRefreshService, { provide: ApiService, useValue: { post } }],
    });
    const service = TestBed.inject(AuthRefreshService);

    await firstValueFrom(service.refresh('refresh-token'));
    await firstValueFrom(service.refresh('refresh-token'));

    expect(post).toHaveBeenCalledTimes(2);
  });
});

function createSession(accessToken: string, refreshToken: string): AuthSessionSource {
  return {
    accessToken,
    refreshToken,
    accountId: 'account-1',
    profileId: 'profile-1',
    email: 'staff@zentech.vn',
    fullName: 'Staff User',
    roles: ['ROLE_MANAGER'],
  };
}

function isTestEnvironmentAlreadyInitialized(error: Error): boolean {
  return (
    error.message.includes('already been initialized') ||
    error.message.includes('already been called')
  );
}
