import '@angular/compiler';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../api/api.service';
import { AuthStorageService } from '../services/auth-storage.service';
import { PermissionCode } from './permission.models';
import { PermissionService } from './permission.service';

describe('PermissionService', () => {
  beforeAll(() => {
    try {
      getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('already')) throw error;
    }
  });

  afterEach(() => TestBed.resetTestingModule());

  it('loads and caches current permissions for the active account', async () => {
    const get = vi.fn(() =>
      of({
        success: true,
        message: 'OK',
        data: {
          role: 'MANAGER',
          permissions: [PermissionCode.ORDER_VIEW],
        },
      })
    );
    TestBed.configureTestingModule({
      providers: [
        PermissionService,
        { provide: ApiService, useValue: { get } },
        {
          provide: AuthStorageService,
          useValue: { getSession: () => ({ accountId: 'account-1' }) },
        },
      ],
    });
    const service = TestBed.inject(PermissionService);

    await firstValueFrom(service.ensureLoaded());
    await firstValueFrom(service.ensureLoaded());

    expect(service.has(PermissionCode.ORDER_VIEW)).toBe(true);
    expect(service.has(PermissionCode.ORDER_UPDATE)).toBe(false);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
