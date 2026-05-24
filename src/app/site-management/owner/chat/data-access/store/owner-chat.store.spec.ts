import { getTestBed, TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { Observable, Subject, of } from 'rxjs';
import { vi } from 'vitest';
import {
  ChatAttachmentType,
  ChatMessageResponse,
  ChatMessageType,
  ConversationResponse,
  ConversationStatus,
  PageResponse,
  ParticipantStatus,
  ParticipantType,
} from '../../../../customer-chat/data-access/models/customer-chat.models';
import { CustomerChatService } from '../../../../customer-chat/data-access/services/customer-chat.service';
import { CustomerChatWebsocketService } from '../../../../customer-chat/data-access/services/customer-chat-websocket.service';
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

  function configureStore(workspace = createWorkspace()) {
    const topicSubjects = new Map<string, Subject<unknown>>();
    const subjectFor = (destination: string): Subject<unknown> => {
      const existing = topicSubjects.get(destination);
      if (existing) {
        return existing;
      }
      const created = new Subject<unknown>();
      topicSubjects.set(destination, created);
      return created;
    };
    const ownerChatService = {
      getWorkspace: vi.fn(() => of(workspace)),
      claimConversation: vi.fn(() => of(createConversationResponse('conv-1', ConversationStatus.AGENT_HANDLING))),
      mapToOwnerChatConversation: vi.fn(mapConversationResponse),
    };
    const customerChatService = {
      getMessages: vi.fn(() => of(createPage(createChatMessages()))),
      closeConversation: vi.fn(() => of(createConversationResponse('conv-1', ConversationStatus.CLOSED))),
      uploadFile: vi.fn(() =>
        of({
          fileKey: 'uploads/chat/conv-1/staff-layout.png',
          fileName: 'staff-layout.png',
          contentType: 'image/png',
          fileSize: 4,
          attachmentType: ChatAttachmentType.IMAGE,
        })
      ),
    };
    const websocketService = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      subscribe: vi.fn(<T>(destination: string): Observable<T> => subjectFor(destination).asObservable() as Observable<T>),
      publish: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        OwnerChatStore,
        {
          provide: OwnerChatService,
          useValue: ownerChatService,
        },
        {
          provide: CustomerChatService,
          useValue: customerChatService,
        },
        {
          provide: CustomerChatWebsocketService,
          useValue: websocketService,
        },
      ],
    });

    return {
      store: TestBed.inject(OwnerChatStore),
      customerChatService,
      websocketService,
      emitTopic<T>(destination: string, value: T): void {
        subjectFor(destination).next(value);
      },
    };
  }

  it('filters conversations by status and search keyword', () => {
    const { store } = configureStore();

    store.loadWorkspace();
    store.setStatusFilter('WAITING_STAFF');
    store.setSearchKeyword('tran');

    expect(store.filteredConversations().map(conversation => conversation.id)).toEqual(['conv-2']);
  });

  it('selects and clears a conversation', () => {
    const { store } = configureStore();

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
    const { store } = configureStore();

    store.loadWorkspace();
    store.selectConversation('conv-1');
    store.openMediaDrawer();
    store.setMediaTab('FILES');

    expect(store.mediaDrawerOpen()).toBe(true);
    expect(store.selectedMedia().map(item => item.id)).toEqual(['attachment-file-1']);

    store.closeMediaDrawer();

    expect(store.mediaDrawerOpen()).toBe(false);
  });

  it('loads message attachments and builds media drawer items from history', () => {
    const { store } = configureStore();

    store.loadWorkspace();
    store.selectConversation('conv-1');

    expect(store.selectedMessages().find((message) => message.id === 'msg-file')?.attachments).toEqual([
      {
        id: 'attachment-file-1',
        type: 'FILE',
        title: 'Bao gia.pdf',
        url: 'https://cdn.example.com/bao-gia.pdf',
        thumbnailUrl: null,
      },
    ]);
    expect(store.selectedMedia().map((item) => item.id)).toEqual([
      'attachment-file-1',
      'attachment-image-1',
    ]);
  });

  it('adds realtime message attachments to timeline and media drawer', () => {
    const { store, emitTopic } = configureStore();
    const realtimeMessage = createChatMessage({
      id: 'msg-realtime-image',
      content: 'Anh moi',
      attachmentId: 'attachment-realtime-image',
      attachmentType: ChatAttachmentType.IMAGE,
      fileName: 'layout-new.png',
      mediaUrl: 'https://cdn.example.com/layout-new.png',
    });

    store.loadWorkspace();
    store.selectConversation('conv-1');
    emitTopic('/topic/conversations.conv-1', realtimeMessage);

    expect(store.selectedMessages().at(-1)?.attachments[0]?.id).toBe('attachment-realtime-image');
    expect(store.selectedMedia().some((item) => item.id === 'attachment-realtime-image')).toBe(true);
  });

  it('publishes staff text messages into the selected conversation', () => {
    const { store, websocketService } = configureStore();

    store.loadWorkspace();
    store.selectConversation('conv-1');
    store.sendStaffMessage('Hang mau den con san.');

    expect(websocketService.publish).toHaveBeenCalledWith('/app/chat/conv-1/send', {
      messageType: ChatMessageType.TEXT,
      content: 'Hang mau den con san.',
      attachments: [],
    });
  });

  it('queues staff files and sends them with optional text', () => {
    const { store, customerChatService, websocketService } = configureStore();
    const file = new File(['demo'], 'staff-layout.png', { type: 'image/png' });

    store.loadWorkspace();
    store.selectConversation('conv-1');
    store.selectStaffFiles([file]);

    expect(customerChatService.uploadFile).not.toHaveBeenCalled();
    expect(websocketService.publish).not.toHaveBeenCalled();
    expect(store.uploads()[0]).toMatchObject({
      conversationId: 'conv-1',
      fileName: 'staff-layout.png',
      status: 'PENDING',
    });

    store.sendStaffMessage('Gui anh cho khach');

    expect(customerChatService.uploadFile).toHaveBeenCalledWith(file);
    expect(store.uploads()).toEqual([]);
    expect(websocketService.publish).toHaveBeenCalledWith('/app/chat/conv-1/send', {
      messageType: ChatMessageType.IMAGE,
      content: 'Gui anh cho khach',
      attachments: [
        {
          fileKey: 'uploads/chat/conv-1/staff-layout.png',
          fileName: 'staff-layout.png',
          contentType: 'image/png',
          fileSize: 4,
          attachmentType: ChatAttachmentType.IMAGE,
        },
      ],
    });
  });

  it('allows staff to send file-only messages', () => {
    const { store, websocketService } = configureStore();
    const file = new File(['demo'], 'staff-layout.png', { type: 'image/png' });

    store.loadWorkspace();
    store.selectConversation('conv-1');
    store.selectStaffFiles([file]);
    store.sendStaffMessage('');

    expect(websocketService.publish).toHaveBeenCalledWith('/app/chat/conv-1/send', {
      messageType: ChatMessageType.IMAGE,
      content: 'staff-layout.png',
      attachments: [
        {
          fileKey: 'uploads/chat/conv-1/staff-layout.png',
          fileName: 'staff-layout.png',
          contentType: 'image/png',
          fileSize: 4,
          attachmentType: ChatAttachmentType.IMAGE,
        },
      ],
    });
  });

  it('accepts a conversation by moving it to staff handling', () => {
    const { store } = configureStore();

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
      attachments: [],
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

function mapConversationResponse(conv: ConversationResponse): OwnerChatConversation {
  return {
    id: conv.id,
    customer: {
      id: conv.customerId,
      fullName: conv.customerName,
      avatarUrl: null,
      initials: 'NA',
      online: true,
    },
    status:
      conv.status === ConversationStatus.AGENT_HANDLING
        ? 'STAFF_HANDLING'
        : conv.status === ConversationStatus.WAITING_FOR_AGENT
          ? 'WAITING_STAFF'
          : conv.status === ConversationStatus.BOT_CONSULTING
            ? 'AI_ASSISTING'
            : 'CLOSED',
    expertRequestStatus: conv.status === ConversationStatus.WAITING_FOR_AGENT ? 'WAITING' : null,
    lastMessagePreview: conv.title,
    lastMessageAtLabel: '09:03',
    unreadCount: 0,
    productContext: 'Ho tro khach hang',
  };
}

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

function createConversationResponse(
  id: string,
  status: ConversationStatus
): ConversationResponse {
  return {
    id,
    customerId: 'customer-1',
    customerName: 'Nguyen Van A',
    customerEmail: 'nguyen@example.com',
    status,
    title: 'Can tu van tai nghe',
    createdAt: '2026-05-24T02:00:00.000Z',
    updatedAt: '2026-05-24T02:03:00.000Z',
    closedAt: status === ConversationStatus.CLOSED ? '2026-05-24T02:04:00.000Z' : null,
    participants: [
      {
        id: 'participant-customer',
        userType: ParticipantType.CUSTOMER,
        referenceId: 'customer-1',
        status: ParticipantStatus.ACTIVE,
        joinedAt: '2026-05-24T02:00:00.000Z',
        leftAt: null,
        displayName: 'Nguyen Van A',
        avatarUrl: null,
      },
    ],
  };
}

function createChatMessages(): ChatMessageResponse[] {
  return [
    createChatMessage({
      id: 'msg-file',
      content: 'Bao gia.pdf',
      attachmentId: 'attachment-file-1',
      attachmentType: ChatAttachmentType.FILE,
      fileName: 'Bao gia.pdf',
      mediaUrl: 'https://cdn.example.com/bao-gia.pdf',
    }),
    createChatMessage({
      id: 'msg-image',
      content: 'layout.png',
      attachmentId: 'attachment-image-1',
      attachmentType: ChatAttachmentType.IMAGE,
      fileName: 'layout.png',
      mediaUrl: 'https://cdn.example.com/layout.png',
    }),
  ];
}

function createChatMessage(options: {
  id: string;
  content: string;
  attachmentId: string;
  attachmentType: ChatAttachmentType;
  fileName: string;
  mediaUrl: string;
}): ChatMessageResponse {
  return {
    id: options.id,
    conversationId: 'conv-1',
    participantId: 'participant-customer',
    senderType: ParticipantType.CUSTOMER,
    senderReferenceId: 'customer-1',
    messageType:
      options.attachmentType === ChatAttachmentType.IMAGE
        ? ChatMessageType.IMAGE
        : ChatMessageType.FILE,
    content: options.content,
    attachments: [
      {
        id: options.attachmentId,
        fileKey: `uploads/chat/conv-1/${options.fileName}`,
        fileName: options.fileName,
        contentType:
          options.attachmentType === ChatAttachmentType.IMAGE ? 'image/png' : 'application/pdf',
        fileSize: 1024,
        attachmentType: options.attachmentType,
        sortOrder: 0,
        mediaUrl: options.mediaUrl,
      },
    ],
    createdAt: '2026-05-24T02:01:00.000Z',
    deletedAt: null,
  };
}
