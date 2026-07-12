/* @vitest-environment jsdom */
import '@angular/compiler';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Router } from '@angular/router';
import { EMPTY } from 'rxjs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthStorageService } from '@/core/services/auth-storage.service';
import { CustomerChatStore } from '@/site-management/customer/chat/data-access/store/customer-chat.store';
import { CartStore } from '@/site-management/customer/cart/data-access/store/cart.store';
import { CustomerShellComponent } from '@/site-management/customer/shell/customer-shell.component';
import { CategoryNavigationStore } from '@/site-management/customer/shell/data-access/store/category-navigation.store';

describe('CustomerShellComponent', () => {
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

  it('does not request customer ticket status for an anonymous storefront visitor', () => {
    const customerChatStore = { loadCustomerTicketStatus: vi.fn() };
    configureComponent({ getSession: vi.fn(() => null), isAuthenticated: vi.fn(() => false) }, customerChatStore);

    TestBed.runInInjectionContext(() => new CustomerShellComponent());

    expect(customerChatStore.loadCustomerTicketStatus).not.toHaveBeenCalled();
  });

  it('loads customer ticket status for an authenticated customer', () => {
    const customerChatStore = { loadCustomerTicketStatus: vi.fn() };
    configureComponent(
      { getSession: vi.fn(() => ({ roles: ['ROLE_CUSTOMER'] })), isAuthenticated: vi.fn(() => true) },
      customerChatStore,
    );

    TestBed.runInInjectionContext(() => new CustomerShellComponent());

    expect(customerChatStore.loadCustomerTicketStatus).toHaveBeenCalledTimes(1);
  });

  function configureComponent(authStorageService: object, customerChatStore: object): void {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { events: EMPTY, url: '/' } },
        { provide: AuthStorageService, useValue: authStorageService },
        { provide: CategoryNavigationStore, useValue: { loadCategoriesOnce: vi.fn() } },
        { provide: CustomerChatStore, useValue: customerChatStore },
        { provide: CartStore, useValue: { loadForCurrentCustomer: vi.fn() } },
      ],
    });
  }
});

function isTestEnvironmentAlreadyInitialized(error: Error): boolean {
  return (
    error.message.includes('already been initialized') ||
    error.message.includes('already been called')
  );
}
