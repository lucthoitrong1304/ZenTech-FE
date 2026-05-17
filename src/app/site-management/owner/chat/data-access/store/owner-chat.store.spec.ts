import { getTestBed, TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import {
  OwnerChatConversation,
  OwnerChatMediaItem,
  OwnerChatMessage,
  OwnerChatWorkspace,
} from '../models/owner-chat.models';
import { OwnerChatService } from '../services/owner-chat.service';
import { OwnerChatStore } from './owner-chat.store';

describe('OwnerChatStore', () => {
  beforeAll(() => {
    try {
      getTestBed().initTestEnvironment(
        BrowserTestingModule,
        platformBrowserTesting()
      );
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('already been initialized')) {
        throw error;
      }
    }
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function configureStore(workspace = createWorkspace()): InstanceType<typeof OwnerChatStore> {
    TestBed.configureTestingModule({
      providers: [
        OwnerChatStore,
        {
          provide: OwnerChatService,
          useValue: {
            getWorkspace: vi.fn(() => of(workspace)),
          },
        },
      ],
    });

    return TestBed.inject(OwnerChatStore);
  }

  it('filters conversations by status and search keyword', () => {
    const store = configureStore();

    store.loadWorkspace();
    store.setStatusFilter('WAITING_STAFF');
    store.setSearchKeyword('tran');

    expect(store.filteredConversations().map(conversation => conversation.id)).toEqual(['conv-2']);
  });

  it('selects and clears a conversation', () => {
    const store = configureStore();

    store.loadWorkspace();
    store.selectConversation('conv-1');

    expect(store.selectedConversation()?.id).toBe('conv-1');
    expect(store.hasSelection()).toBe(true);
    expect(store.conversations()[0].unreadCount).toBe(0);

    store.clearSelection();

    expect(store.selectedConversation()).toBeNull();
    expect(store.mediaDrawerOpen()).toBe(false);
  });

  it('opens the media drawer and filters media by tab', () => {
    const store = configureStore();

    store.loadWorkspace();
    store.selectConversation('conv-1');
    store.openMediaDrawer();
    store.setMediaTab('FILES');

    expect(store.mediaDrawerOpen()).toBe(true);
    expect(store.selectedMedia().map(item => item.id)).toEqual(['file-1']);

    store.closeMediaDrawer();

    expect(store.mediaDrawerOpen()).toBe(false);
  });

  it('sends a staff message into the selected conversation', () => {
    const store = configureStore();

    store.loadWorkspace();
    store.selectConversation('conv-1');
    store.sendStaffMessage('Hang mau den con san.');

    expect(store.selectedMessages().at(-1)?.body).toBe('Hang mau den con san.');
    expect(store.selectedConversation()?.lastMessagePreview).toBe('Hang mau den con san.');
    expect(store.selectedConversation()?.status).toBe('STAFF_HANDLING');
  });

  it('accepts a conversation by moving it to staff handling', () => {
    const store = configureStore();

    store.loadWorkspace();
    store.selectConversation('conv-1');
    store.acceptConversation();

    expect(store.selectedConversation()?.status).toBe('STAFF_HANDLING');
    expect(store.selectedConversation()?.expertRequestStatus).toBe('ACCEPTED');
  });
});

function createWorkspace(): OwnerChatWorkspace {
  const conversations: OwnerChatConversation[] = [
    {
      id: 'conv-1',
      customer: {
        id: 'customer-1',
        fullName: 'Nguyen Van A',
        avatarUrl: null,
        initials: 'NA',
        online: true,
      },
      status: 'AI_ASSISTING',
      expertRequestStatus: 'WAITING',
      lastMessagePreview: 'Can tu van tai nghe',
      lastMessageAtLabel: '10:42',
      unreadCount: 2,
      productContext: 'Sony',
    },
    {
      id: 'conv-2',
      customer: {
        id: 'customer-2',
        fullName: 'Tran Thi B',
        avatarUrl: null,
        initials: 'TB',
        online: false,
      },
      status: 'WAITING_STAFF',
      expertRequestStatus: 'ACCEPTED',
      lastMessagePreview: 'Cho nhan vien goi lai',
      lastMessageAtLabel: 'Hom qua',
      unreadCount: 0,
      productContext: 'Ban phim',
    },
  ];
  const messages: OwnerChatMessage[] = [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      sender: 'CUSTOMER',
      senderName: 'Nguyen Van A',
      body: 'Can tu van tai nghe',
      sentAtLabel: '10:40',
    },
  ];
  const mediaItems: OwnerChatMediaItem[] = [
    {
      id: 'image-1',
      conversationId: 'conv-1',
      type: 'IMAGE',
      title: 'Anh san pham',
      subtitle: 'Anh',
      url: '#',
      thumbnailUrl: '#',
    },
    {
      id: 'file-1',
      conversationId: 'conv-1',
      type: 'FILE',
      title: 'Bao gia.pdf',
      subtitle: '1 MB',
      url: '#',
      thumbnailUrl: null,
    },
  ];

  return { conversations, messages, mediaItems };
}
