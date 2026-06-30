/* @vitest-environment jsdom */
import '@angular/compiler';
import { Component } from '@angular/core';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PermissionCode } from '../../core/permissions/permission.models';
import { PermissionService } from '../../core/permissions/permission.service';
import { loadManagementPermissionComponent } from './management-permission-loader';
import { ManagementNoPermissionComponent } from './pages/management-no-permission/management-no-permission.component';

@Component({
  standalone: true,
  template: '',
})
class AllowedManagementComponent {}

describe('loadManagementPermissionComponent', () => {
  beforeAll(() => {
    try {
      getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('already')) {
        throw error;
      }
    }
  });

  afterEach(() => TestBed.resetTestingModule());

  it('loads the requested page when the user has the required permission', async () => {
    const ensureLoaded = vi.fn(() => of(true));
    const has = vi.fn(() => true);
    const loader = vi.fn(async () => AllowedManagementComponent);

    TestBed.configureTestingModule({
      providers: [{ provide: PermissionService, useValue: { ensureLoaded, has } }],
    });

    const component = await TestBed.runInInjectionContext(() =>
      loadManagementPermissionComponent(PermissionCode.ORDER_VIEW, loader)(),
    );

    expect(component).toBe(AllowedManagementComponent);
    expect(ensureLoaded).toHaveBeenCalledTimes(1);
    expect(has).toHaveBeenCalledWith(PermissionCode.ORDER_VIEW);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('loads the no-permission page when the user lacks the required permission', async () => {
    const ensureLoaded = vi.fn(() => of(true));
    const has = vi.fn(() => false);
    const loader = vi.fn(async () => AllowedManagementComponent);

    TestBed.configureTestingModule({
      providers: [{ provide: PermissionService, useValue: { ensureLoaded, has } }],
    });

    const component = await TestBed.runInInjectionContext(() =>
      loadManagementPermissionComponent(PermissionCode.ORDER_VIEW, loader)(),
    );

    expect(component).toBe(ManagementNoPermissionComponent);
    expect(ensureLoaded).toHaveBeenCalledTimes(1);
    expect(has).toHaveBeenCalledWith(PermissionCode.ORDER_VIEW);
    expect(loader).not.toHaveBeenCalled();
  });

  it('propagates permission loading errors so auth handling can stay centralized', async () => {
    const error = new Error('Unauthorized');
    const ensureLoaded = vi.fn(() => throwError(() => error));
    const has = vi.fn(() => false);
    const loader = vi.fn(async () => AllowedManagementComponent);

    TestBed.configureTestingModule({
      providers: [{ provide: PermissionService, useValue: { ensureLoaded, has } }],
    });

    const result = TestBed.runInInjectionContext(() =>
      loadManagementPermissionComponent(PermissionCode.ORDER_VIEW, loader)(),
    );

    await expect(result).rejects.toBe(error);
    expect(has).not.toHaveBeenCalled();
    expect(loader).not.toHaveBeenCalled();
  });
});
