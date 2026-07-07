import '@angular/compiler';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ManagementChatConversation } from '../../data-access/models/management-chat.models';
import { ChatHeaderComponent } from './chat-header.component';

describe('ChatHeaderComponent', () => {
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

  it('does not allow management actions while AI is assisting', () => {
    const component = createComponent({
      status: 'AI_ASSISTING',
      currentStaffActive: false,
    });

    expect(canManage(component)).toBe(false);
  });

  it('does not allow management actions for conversations handled by another staff member', () => {
    const component = createComponent({
      status: 'STAFF_HANDLING',
      currentStaffActive: false,
    });

    expect(canManage(component)).toBe(false);
  });

  it('allows management actions for the active staff conversation', () => {
    const component = createComponent({
      status: 'STAFF_HANDLING',
      currentStaffActive: true,
    });

    expect(canManage(component)).toBe(true);
  });
});

function createComponent(
  overrides: Partial<ManagementChatConversation> = {},
  canUpdate = true
): ChatHeaderComponent {
  const component = TestBed.runInInjectionContext(() => new ChatHeaderComponent());
  Object.defineProperty(component, 'conversation', {
    value: () => createConversation(overrides),
  });
  Object.defineProperty(component, 'canUpdate', {
    value: () => canUpdate,
  });
  return component;
}

function isTestEnvironmentAlreadyInitialized(error: Error): boolean {
  return (
    error.message.includes('already been initialized') ||
    error.message.includes('already been called')
  );
}

function canManage(component: ChatHeaderComponent): boolean {
  return (component as unknown as { canManageConversation(): boolean }).canManageConversation();
}

function createConversation(
  overrides: Partial<ManagementChatConversation> = {}
): ManagementChatConversation {
  return {
    id: 'conv-1',
    customer: {
      id: 'customer-1',
      email: 'nguyen@example.com',
      fullName: 'Nguyen Van A',
      avatarUrl: null,
      initials: 'NA',
      online: true,
    },
    status: 'STAFF_HANDLING',
    currentStaffActive: true,
    expertRequestStatus: null,
    lastMessagePreview: 'Can tu van tai nghe',
    lastMessageAtLabel: '10:42',
    unreadCount: 0,
    productContext: 'Ho tro khach hang',
    ...overrides,
  };
}
