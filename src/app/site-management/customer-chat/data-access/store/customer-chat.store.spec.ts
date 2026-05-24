import { getTestBed, TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { CustomerChatSession } from '../models/customer-chat.models';
import { CustomerChatService } from '../services/customer-chat.service';
import { CustomerChatStore } from './customer-chat.store';

describe('CustomerChatStore', () => {
  beforeAll(() => {
    try {
      getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('already been initialized')) {
        throw error;
      }
    }
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function configureStore(session = createSession()): InstanceType<typeof CustomerChatStore> {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CustomerChatService,
          useValue: {
            getSession: vi.fn(() => of(session)),
            sendCustomerMessage: vi.fn(() => of('Nhan vien da nhan tin nhan.')),
            uploadCustomerFiles: vi.fn(() =>
              of([
                {
                  id: 'uploaded-1',
                  title: 'layout.png',
                  subtitle: '12 KB - Vua tai len',
                  url: '#',
                  type: 'IMAGE',
                },
              ])
            ),
          },
        },
      ],
    });

    return TestBed.inject(CustomerChatStore);
  }

  it('loads a session and exposes staff joined state', () => {
    const store = configureStore();

    store.loadSession();

    expect(store.session()?.id).toBe('session-1');
    expect(store.staffJoined()).toBe(true);
    expect(store.messages().length).toBe(2);
  });

  it('controls popup visibility', () => {
    const store = configureStore();

    store.openPopup();
    expect(store.popupOpen()).toBe(true);

    store.togglePopup();
    expect(store.popupOpen()).toBe(false);

    store.openPopup();
    store.closePopup();
    expect(store.popupOpen()).toBe(false);
  });

  it('sends a customer message and appends a staff response', () => {
    const store = configureStore();

    store.loadSession();
    store.sendMessage('Con mau bac khong?');

    expect(store.messages().at(-2)?.body).toBe('Con mau bac khong?');
    expect(store.messages().at(-1)?.sender).toBe('STAFF');
    expect(store.sending()).toBe(false);
  });

  it('filters shared content by selected tab', () => {
    const store = configureStore();

    store.loadSession();
    store.setSharedContentTab('FILES');

    expect(store.selectedSharedItems().map(item => item.id)).toEqual(['file-1']);

    store.setSharedContentTab('LINKS');

    expect(store.selectedSharedItems().map(item => item.id)).toEqual(['link-1']);
  });

  it('tracks upload progress and adds uploaded files to shared content', () => {
    const store = configureStore();
    const file = new File(['demo'], 'layout.png', { type: 'image/png' });

    store.loadSession();
    store.selectFiles([file]);

    expect(store.uploads()[0].status).toBe('COMPLETE');
    expect(store.uploads()[0].progress).toBe(100);
    expect(store.sharedItems().some(item => item.id === 'uploaded-1')).toBe(true);
    expect(store.activeSharedTab()).toBe('MEDIA');
  });

  it('opens and closes the shared content sidebar', () => {
    const store = configureStore();

    store.closeSharedSidebar();
    expect(store.sharedSidebarOpen()).toBe(false);

    store.toggleSharedSidebar();
    expect(store.sharedSidebarOpen()).toBe(true);
  });

  it('switches full chat between details and expanded shared content', () => {
    const store = configureStore();

    store.loadSession();
    store.openFullChat();

    expect(store.fullSidebarMode()).toBe('DETAILS');
    expect(store.activeSharedTab()).toBe('ALL');
    expect(store.selectedSharedItems().length).toBe(3);

    store.requestSharedContent();
    expect(store.fullSidebarMode()).toBe('SHARED');
    expect(store.activeSharedTab()).toBe('ALL');

    store.requestConversationDetails();
    expect(store.fullSidebarMode()).toBe('DETAILS');
  });
});

function createSession(): CustomerChatSession {
  return {
    id: 'session-1',
    status: 'STAFF_JOINED',
    customer: {
      id: 'customer-1',
      name: 'Ban',
      roleLabel: 'Khach hang',
      avatarUrl: null,
      initials: 'BN',
      online: true,
    },
    assistant: {
      id: 'ai',
      name: 'ZenTech AI',
      roleLabel: 'AI',
      avatarUrl: null,
      initials: 'AI',
      online: true,
    },
    staff: {
      id: 'staff-1',
      name: 'Minh Anh',
      roleLabel: 'Tu van vien',
      avatarUrl: null,
      initials: 'MA',
      online: true,
    },
    product: {
      id: 'product-1',
      name: 'Mercury V60',
      imageUrl: '/home/asset-5.webp',
      priceLabel: '$109',
      stockLabel: 'Con hang',
    },
    lastActivityLabel: 'Vua xong',
    messages: [
      {
        id: 'msg-1',
        sender: 'AI',
        senderName: 'ZenTech AI',
        body: 'Xin chao',
        sentAtLabel: '10:00',
        attachments: [],
      },
      {
        id: 'msg-2',
        sender: 'STAFF',
        senderName: 'Minh Anh',
        body: 'Em san sang ho tro.',
        sentAtLabel: '10:01',
        attachments: [],
      },
    ],
    sharedItems: [
      {
        id: 'media-1',
        type: 'IMAGE',
        title: 'Anh san pham',
        subtitle: 'Anh',
        url: '#',
        thumbnailUrl: '#',
      },
      {
        id: 'file-1',
        type: 'FILE',
        title: 'Specs.pdf',
        subtitle: '1 MB',
        url: '#',
        thumbnailUrl: null,
      },
      {
        id: 'link-1',
        type: 'LINK',
        title: 'Product page',
        subtitle: 'zentech.vn',
        url: '#',
        thumbnailUrl: null,
      },
    ],
  };
}
