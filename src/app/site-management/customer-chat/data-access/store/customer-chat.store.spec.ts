import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { EMPTY, Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthStorageService } from '../../../../core/services/auth-storage.service';
import {
  ChatAttachmentType,
  ChatMessageResponse,
  ChatMessageType,
  ConversationResponse,
  ConversationStatus,
  PageResponse,
  ParticipantStatus,
  ParticipantType,
} from '../models/customer-chat.models';
import { CustomerChatService } from '../services/customer-chat.service';
import { CustomerChatWebsocketService } from '../services/customer-chat-websocket.service';
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

  function configureStore(options: { uploadFails?: boolean; conversations?: ConversationResponse[] } = {}) {
    const conversation = options.conversations?.[0] ?? createConversation();
    const conversations = options.conversations ?? [conversation];
    const messages = createMessages();
    const chatService = {
      getMyConversations: vi.fn(() => of(createPage(conversations))),
      getMessages: vi.fn(() => of(createPage(messages))),
      createOrGetConversation: vi.fn(() => of(conversation)),
      createNewConversation: vi.fn(() => of(createConversation('conversation-2'))),
      uploadFile: vi.fn(() =>
        options.uploadFails
          ? throwError(() => new Error('upload failed'))
          : of({
              fileKey: 'uploads/chat/conversation-1/layout.png',
              fileName: 'layout.png',
              contentType: 'image/png',
              fileSize: 4,
              attachmentType: ChatAttachmentType.IMAGE,
            })
      ),
      requestAgent: vi.fn(() => of(conversation)),
      closeConversation: vi.fn(() => of({ ...conversation, status: ConversationStatus.CLOSED })),
    };
    const websocketService = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      subscribe: vi.fn(<T>(): Observable<T> => EMPTY),
      publish: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        CustomerChatStore,
        {
          provide: CustomerChatService,
          useValue: chatService,
        },
        {
          provide: CustomerChatWebsocketService,
          useValue: websocketService,
        },
        {
          provide: AuthStorageService,
          useValue: {
            getSession: vi.fn(() => ({ accountId: 'customer-1' })),
          },
        },
      ],
    });

    return {
      store: TestBed.inject(CustomerChatStore),
      chatService,
      websocketService,
    };
  }

  it('loads conversations, messages, and exposes staff joined state', () => {
    const { store, chatService, websocketService } = configureStore();

    store.loadSession();

    expect(chatService.getMyConversations).toHaveBeenCalledWith(0, 100);
    expect(chatService.getMessages).toHaveBeenCalledWith('conversation-1', 0, 100);
    expect(websocketService.connect).toHaveBeenCalled();
    expect(store.session()?.id).toBe('conversation-1');
    expect(store.staffJoined()).toBe(true);
    expect(store.messages().length).toBe(3);
  });

  it('controls popup visibility', () => {
    const { store } = configureStore();

    store.openPopup();
    expect(store.popupOpen()).toBe(true);

    store.togglePopup();
    expect(store.popupOpen()).toBe(false);

    store.openPopup();
    store.closePopup();
    expect(store.popupOpen()).toBe(false);
  });

  it('publishes customer text messages through websocket', () => {
    const { store, websocketService } = configureStore();

    store.loadSession();
    store.sendMessage('Con mau bac khong?');

    expect(websocketService.publish).toHaveBeenCalledWith('/app/chat/conversation-1/send', {
      messageType: ChatMessageType.TEXT,
      content: 'Con mau bac khong?',
      attachments: [],
    });
  });

  it('filters shared content by selected tab', () => {
    const { store } = configureStore();

    store.loadSession();
    store.setSharedContentTab('FILES');

    expect(store.selectedSharedItems().map((item) => item.id)).toEqual(['attachment-file-1']);

    store.setSharedContentTab('MEDIA');

    expect(store.selectedSharedItems().map((item) => item.id)).toEqual(['attachment-image-1']);
  });

  it('queues selected files without uploading or publishing immediately', () => {
    const { store, chatService, websocketService } = configureStore();
    const file = new File(['demo'], 'layout.png', { type: 'image/png' });

    store.loadSession();
    store.selectFiles([file]);

    expect(chatService.uploadFile).not.toHaveBeenCalled();
    expect(websocketService.publish).not.toHaveBeenCalled();
    expect(store.uploads()[0]).toMatchObject({
      conversationId: 'conversation-1',
      fileName: 'layout.png',
      status: 'PENDING',
      progress: 0,
    });
  });

  it('uploads pending files and publishes one attachment message when sending', () => {
    const { store, chatService, websocketService } = configureStore();
    const file = new File(['demo'], 'layout.png', { type: 'image/png' });

    store.loadSession();
    store.selectFiles([file]);
    store.sendMessage('Xem giup minh file nay');

    expect(chatService.uploadFile).toHaveBeenCalledWith(file);
    expect(store.uploads()).toEqual([]);
    expect(websocketService.publish).toHaveBeenCalledWith('/app/chat/conversation-1/send', {
      messageType: ChatMessageType.IMAGE,
      content: 'Xem giup minh file nay',
      attachments: [
        {
          fileKey: 'uploads/chat/conversation-1/layout.png',
          fileName: 'layout.png',
          contentType: 'image/png',
          fileSize: 4,
          attachmentType: ChatAttachmentType.IMAGE,
        },
      ],
    });
  });

  it('allows sending a file-only pending message', () => {
    const { store, websocketService } = configureStore();
    const file = new File(['demo'], 'layout.png', { type: 'image/png' });

    store.loadSession();
    store.selectFiles([file]);
    store.sendMessage('');

    expect(websocketService.publish).toHaveBeenCalledWith('/app/chat/conversation-1/send', {
      messageType: ChatMessageType.IMAGE,
      content: 'layout.png',
      attachments: [
        {
          fileKey: 'uploads/chat/conversation-1/layout.png',
          fileName: 'layout.png',
          contentType: 'image/png',
          fileSize: 4,
          attachmentType: ChatAttachmentType.IMAGE,
        },
      ],
    });
  });

  it('keeps pending uploads scoped to their conversation when switching conversations', () => {
    const { store } = configureStore({
      conversations: [createConversation('conversation-1'), createConversation('conversation-2')],
    });
    const file = new File(['demo'], 'layout.png', { type: 'image/png' });

    store.loadSession();
    store.selectFiles([file]);
    expect(store.uploads().map((upload) => upload.fileName)).toEqual(['layout.png']);

    store.switchConversation('conversation-2');
    expect(store.uploads()).toEqual([]);

    store.switchConversation('conversation-1');
    expect(store.uploads().map((upload) => upload.fileName)).toEqual(['layout.png']);
  });

  it('marks pending uploads failed and does not publish when upload fails', () => {
    const { store, websocketService } = configureStore({ uploadFails: true });
    const file = new File(['demo'], 'layout.png', { type: 'image/png' });

    store.loadSession();
    store.selectFiles([file]);
    store.sendMessage('Gui file');

    expect(store.uploads()[0].status).toBe('FAILED');
    expect(store.uploads()[0].progress).toBe(100);
    expect(websocketService.publish).not.toHaveBeenCalled();
  });

  it('opens and closes the shared content sidebar', () => {
    const { store } = configureStore();

    store.closeSharedSidebar();
    expect(store.sharedSidebarOpen()).toBe(false);

    store.toggleSharedSidebar();
    expect(store.sharedSidebarOpen()).toBe(true);
  });

  it('switches full chat between details and expanded shared content', () => {
    const { store } = configureStore();

    store.loadSession();
    store.openFullChat();

    expect(store.fullSidebarMode()).toBe('DETAILS');
    expect(store.activeSharedTab()).toBe('ALL');
    expect(store.selectedSharedItems().length).toBe(2);

    store.requestSharedContent();
    expect(store.fullSidebarMode()).toBe('SHARED');
    expect(store.activeSharedTab()).toBe('ALL');

    store.requestConversationDetails();
    expect(store.fullSidebarMode()).toBe('DETAILS');
  });
});

function createPage<T>(content: T[]): PageResponse<T> {
  return {
    content,
    pageNumber: 0,
    pageSize: content.length,
    totalElements: content.length,
    totalPages: 1,
    last: true,
  };
}

function createConversation(id = 'conversation-1'): ConversationResponse {
  return {
    id,
    customerId: 'customer-1',
    customerName: 'Ban',
    customerEmail: 'ban@example.com',
    status: ConversationStatus.AGENT_HANDLING,
    title: 'Product Support',
    createdAt: '2026-05-24T02:00:00.000Z',
    updatedAt: '2026-05-24T02:03:00.000Z',
    closedAt: null,
    participants: [
      {
        id: 'participant-customer',
        userType: ParticipantType.CUSTOMER,
        referenceId: 'customer-1',
        status: ParticipantStatus.ACTIVE,
        joinedAt: '2026-05-24T02:00:00.000Z',
        leftAt: null,
        displayName: 'Ban',
        avatarUrl: null,
      },
      {
        id: 'participant-bot',
        userType: ParticipantType.BOT,
        referenceId: 'zentech-ai',
        status: ParticipantStatus.ACTIVE,
        joinedAt: '2026-05-24T02:00:00.000Z',
        leftAt: null,
        displayName: 'ZenTech AI',
        avatarUrl: null,
      },
      {
        id: 'participant-staff',
        userType: ParticipantType.EMPLOYEE,
        referenceId: 'staff-1',
        status: ParticipantStatus.ACTIVE,
        joinedAt: '2026-05-24T02:01:00.000Z',
        leftAt: null,
        displayName: 'Minh Anh',
        avatarUrl: null,
      },
    ],
  };
}

function createMessages(): ChatMessageResponse[] {
  return [
    {
      id: 'msg-1',
      conversationId: 'conversation-1',
      participantId: 'participant-bot',
      senderType: ParticipantType.BOT,
      senderReferenceId: 'zentech-ai',
      messageType: ChatMessageType.TEXT,
      content: 'Xin chao',
      attachments: [],
      createdAt: '2026-05-24T02:00:00.000Z',
      deletedAt: null,
    },
    {
      id: 'msg-2',
      conversationId: 'conversation-1',
      participantId: 'participant-customer',
      senderType: ParticipantType.CUSTOMER,
      senderReferenceId: 'customer-1',
      messageType: ChatMessageType.FILE,
      content: 'Specs.pdf',
      attachments: [
        {
          id: 'attachment-file-1',
          fileKey: 'uploads/chat/conversation-1/specs.pdf',
          fileName: 'Specs.pdf',
          contentType: 'application/pdf',
          fileSize: 1024,
          attachmentType: ChatAttachmentType.FILE,
          sortOrder: 0,
          mediaUrl: 'https://cdn.example.com/specs.pdf',
        },
      ],
      createdAt: '2026-05-24T02:01:00.000Z',
      deletedAt: null,
    },
    {
      id: 'msg-3',
      conversationId: 'conversation-1',
      participantId: 'participant-customer',
      senderType: ParticipantType.CUSTOMER,
      senderReferenceId: 'customer-1',
      messageType: ChatMessageType.IMAGE,
      content: 'layout.png',
      attachments: [
        {
          id: 'attachment-image-1',
          fileKey: 'uploads/chat/conversation-1/layout.png',
          fileName: 'layout.png',
          contentType: 'image/png',
          fileSize: 2048,
          attachmentType: ChatAttachmentType.IMAGE,
          sortOrder: 0,
          mediaUrl: 'https://cdn.example.com/layout.png',
        },
      ],
      createdAt: '2026-05-24T02:02:00.000Z',
      deletedAt: null,
    },
  ];
}
