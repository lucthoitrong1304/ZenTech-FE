import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import {
  addEntities,
  addEntity,
  removeEntities,
  removeEntity,
  setAllEntities,
  updateEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, Subscription, catchError, filter, forkJoin, of, pipe, switchMap, tap, map } from 'rxjs';
import { ManagementChatEvent, ManagementChatEventType } from '@/site-management/management/chat/data-access/models/management-chat.event';
import {
  ManagementChatConversation,
  ManagementChatConversationStatus,
  ManagementChatArchiveFilter,
  ManagementChatExpertRequestFilter,
  ManagementChatExpertRequestStatus,
  ManagementChatMediaItem,
  ManagementChatMediaTab,
  ManagementChatMediaType,
  ManagementChatMessage,
  ManagementChatStatusFilter,
  ManagementChatUpload,
  ManagementChatWorkspace,
  ChatStaffResponse,
} from '@/site-management/management/chat/data-access/models/management-chat.models';
import { ManagementChatService } from '@/site-management/management/chat/data-access/services/management-chat.service';
import { CustomerChatService } from '@/site-management/shared/chat/data-access/services/customer-chat.service';
import { CustomerChatWebsocketService } from '@/site-management/shared/chat/data-access/services/customer-chat-websocket.service';
import { ClientLogEventType } from '@/core/observability/logging/client-log.model';
import { ClientLogService } from '@/core/observability/logging/client-log.service';
import { generateTraceId } from '@/core/observability/tracing/trace-id.util';
import {
  ChatMessageResponse,
  ChatConversationEventResponse,
  ConversationResponse,
  ConversationStatus,
  ParticipantType,
  ParticipantStatus,
  formatTime,
  ChatMessageType,
  ChatAttachmentType,
  formatBytes,
} from '@/site-management/shared/chat/data-access/models/customer-chat.models';

interface ManagementChatUiState {
  selectedConversationId: string | null;
  statusFilter: ManagementChatStatusFilter;
  myHandlingOnly: boolean;
  archiveFilter: ManagementChatArchiveFilter;
  expertRequestFilter: ManagementChatExpertRequestFilter;
  searchKeyword: string;
  activeMediaTab: ManagementChatMediaTab;
  mediaDrawerOpen: boolean;
  loading: boolean;
  messagesLoading: boolean;
  errorMessage: string | null;
  activeStaffList: ChatStaffResponse[];
  searchSidebarOpen: boolean;
  isSearching: boolean;
  searchResults: ChatMessageResponse[];
  highlightedMessageId: string | null;
  lifecycleNotice: string | null;
}

const CONVERSATION_ENTITY_CONFIG = {
  collection: 'conversation',
  selectId: (conversation: ManagementChatConversation) => conversation.id,
} as const;

const MESSAGE_ENTITY_CONFIG = {
  collection: 'message',
  selectId: (message: ManagementChatMessage) => message.id,
} as const;

const MEDIA_ENTITY_CONFIG = {
  collection: 'media',
  selectId: (mediaItem: ManagementChatMediaItem) => mediaItem.id,
} as const;

const UPLOAD_ENTITY_CONFIG = {
  collection: 'upload',
  selectId: (upload: ManagementChatUpload) => upload.id,
} as const;

const INITIAL_STATE: ManagementChatUiState = {
  selectedConversationId: null,
  statusFilter: 'ALL',
  myHandlingOnly: false,
  archiveFilter: 'ALL',
  expertRequestFilter: 'ALL',
  searchKeyword: '',
  activeMediaTab: 'ALL',
  mediaDrawerOpen: false,
  loading: false,
  messagesLoading: false,
  errorMessage: null,
  searchSidebarOpen: false,
  isSearching: false,
  searchResults: [],
  highlightedMessageId: null,
  lifecycleNotice: null,
  activeStaffList: [],
};

const STATUS_LABELS: Record<ManagementChatConversationStatus, string> = {
  AI_ASSISTING: 'AI đang tư vấn',
  WAITING_STAFF: 'Đang chờ nhân viên',
  STAFF_HANDLING: 'Nhân viên đang xử lý',
  CLOSED: 'Đã đóng',
};

const EXPERT_REQUEST_LABELS: Record<ManagementChatExpertRequestStatus, string> = {
  WAITING: 'Đang chờ phản hồi',
  ACCEPTED: 'Đã chấp nhận',
  DECLINED: 'Đã từ chối',
  CANCELLED: 'Đã bị hủy',
};

function mapToManagementChatMessage(
  m: ChatMessageResponse,
  customerName: string
): ManagementChatMessage {
  let sender: 'CUSTOMER' | 'AI' | 'STAFF' = 'CUSTOMER';
  let senderName = customerName || 'Khách hàng';

  if (m.senderType === ParticipantType.BOT) {
    sender = 'AI';
    senderName = 'ZenTech AI';
  } else if (m.senderType === ParticipantType.CUSTOMER) {
    sender = 'CUSTOMER';
  } else {
    sender = 'STAFF';
    senderName = 'Bạn (Nhân viên)';
  }

  return {
    id: m.id,
    conversationId: m.conversationId,
    sender,
    senderName,
    messageType: m.messageType,
    body: m.content || '',
    sentAtLabel: formatTime(m.createdAt),
    attachments: (m.attachments || []).map((attachment) => ({
      id: attachment.id,
      type: attachment.attachmentType as unknown as ManagementChatMediaType,
      title: attachment.fileName,
      url: attachment.mediaUrl || '',
      thumbnailUrl:
        attachment.attachmentType === ChatAttachmentType.IMAGE
          ? attachment.mediaUrl || null
          : null,
    })),
    recommendedProducts: m.recommendedProducts || [],
  };
}

function mapToManagementChatMediaItems(m: ChatMessageResponse): ManagementChatMediaItem[] {
  return (m.attachments || []).map((attachment) => ({
    id: attachment.id,
    conversationId: m.conversationId,
    type: attachment.attachmentType as unknown as ManagementChatMediaType,
    title: attachment.fileName,
    subtitle: `${formatBytes(attachment.fileSize)} - ${formatTime(m.createdAt)}`,
    url: attachment.mediaUrl || '',
    thumbnailUrl:
      attachment.attachmentType === ChatAttachmentType.IMAGE ? attachment.mediaUrl || null : null,
  }));
}

function mapOutgoingMessageType(
  attachmentType: ChatAttachmentType | null,
  attachmentCount: number
): ChatMessageType {
  if (attachmentCount === 0) {
    return ChatMessageType.TEXT;
  }

  if (attachmentCount > 1) {
    return ChatMessageType.MEDIA;
  }

  switch (attachmentType) {
    case ChatAttachmentType.IMAGE:
      return ChatMessageType.IMAGE;
    case ChatAttachmentType.VIDEO:
      return ChatMessageType.VIDEO;
    default:
      return ChatMessageType.FILE;
  }
}

export const ManagementChatStore = signalStore(
  withState<ManagementChatUiState>(INITIAL_STATE),
  withEntities<ManagementChatConversation, 'conversation'>({
    entity: {} as ManagementChatConversation,
    collection: 'conversation',
  }),
  withEntities<ManagementChatMessage, 'message'>({
    entity: {} as ManagementChatMessage,
    collection: 'message',
  }),
  withEntities<ManagementChatMediaItem, 'media'>({
    entity: {} as ManagementChatMediaItem,
    collection: 'media',
  }),
  withEntities<ManagementChatUpload, 'upload'>({
    entity: {} as ManagementChatUpload,
    collection: 'upload',
  }),
  withComputed(
    ({
      conversationEntities,
      messageEntities,
      mediaEntities,
      uploadEntities,
      selectedConversationId,
      statusFilter,
      myHandlingOnly,
      archiveFilter,
      expertRequestFilter,
      searchKeyword,
      activeMediaTab,
    }) => ({
      conversations: computed(() => conversationEntities()),
      messages: computed(() => messageEntities()),
      mediaItems: computed(() => mediaEntities()),
      uploads: computed(() => {
        const conversationId = selectedConversationId();
        return conversationId
          ? uploadEntities().filter(upload => upload.conversationId === conversationId)
          : [];
      }),
      hasPendingAttachments: computed(() => {
        const conversationId = selectedConversationId();
        return !!conversationId && uploadEntities().some(
          upload =>
            upload.conversationId === conversationId &&
            (upload.status === 'PENDING' || upload.status === 'FAILED')
        );
      }),
      filteredConversations: computed(() => {
        const normalizedKeyword = normalize(searchKeyword());

        return conversationEntities().filter(conversation => {
          const matchesStatus =
            statusFilter() === 'ALL' || conversation.status === statusFilter();
          const matchesMyHandling = !myHandlingOnly() || conversation.currentStaffActive;
          const matchesArchive =
            archiveFilter() === 'ALL' ||
            (archiveFilter() === 'ARCHIVED' ? !!conversation.archived : !conversation.archived);
          const matchesExpertRequest =
            expertRequestFilter() === 'ALL' ||
            conversation.expertRequestStatus === expertRequestFilter();
          const searchableText = normalize(
            `${conversation.customer.fullName} ${conversation.lastMessagePreview} ${conversation.productContext}`
          );
          const matchesKeyword =
            !normalizedKeyword || searchableText.includes(normalizedKeyword);

          return matchesStatus && matchesMyHandling && matchesArchive && matchesExpertRequest && matchesKeyword;
        }).sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || ''));
      }),
      selectedConversation: computed(
        () =>
          conversationEntities().find(conversation => conversation.id === selectedConversationId()) ??
          null
      ),
      canManageSelectedConversation: computed(
        () => {
          const conversation = conversationEntities().find(
            item => item.id === selectedConversationId()
          );
          return !conversation?.archived && conversation?.status === 'STAFF_HANDLING' && conversation.currentStaffActive;
        }
      ),
      canReplyToSelectedConversation: computed(
        () => {
          const conversation = conversationEntities().find(
            item => item.id === selectedConversationId()
          );
          return !conversation?.archived && conversation?.status === 'STAFF_HANDLING' && conversation.currentStaffActive;
        }
      ),
      selectedMessages: computed(() =>
        messageEntities().filter(message => message.conversationId === selectedConversationId())
      ),
      selectedMedia: computed(() => {
        const currentConversationId = selectedConversationId();

        return mediaEntities().filter(mediaItem => {
          const matchesConversation = mediaItem.conversationId === currentConversationId;

          if (!matchesConversation) {
            return false;
          }

          switch (activeMediaTab()) {
            case 'MEDIA':
              return mediaItem.type === 'IMAGE' || mediaItem.type === 'VIDEO';
            case 'FILES':
              return mediaItem.type === 'FILE';
            case 'LINKS':
              return mediaItem.type === 'LINK';
            default:
              return true;
          }
        });
      }),
      statusCounts: computed(() =>
        (Object.keys(STATUS_LABELS) as ManagementChatConversationStatus[]).map(status => ({
          status,
          label: STATUS_LABELS[status],
          count: conversationEntities().filter(conversation => conversation.status === status)
            .length,
        }))
      ),
      expertRequestCounts: computed(() =>
        (Object.keys(EXPERT_REQUEST_LABELS) as ManagementChatExpertRequestStatus[]).map(status => ({
          status,
          label: EXPERT_REQUEST_LABELS[status],
          count: conversationEntities().filter(
            conversation => conversation.expertRequestStatus === status
          ).length,
        }))
      ),
      hasSelection: computed(() => selectedConversationId() !== null),
    })
  ),
  withMethods((
    store,
    managementChatService = inject(ManagementChatService),
    customerChatService = inject(CustomerChatService),
    websocketService = inject(CustomerChatWebsocketService),
    clientLogService = inject(ClientLogService)
  ) => {
    let queueSub: Subscription | null = null;
    const receivedTraceIds = new Set<string>();
    let messageSub: Subscription | null = null;
    let conversationSub: Subscription | null = null;

    const logRealtimeSend = (traceId: string, destination: string): void => {
      clientLogService.info(ClientLogEventType.FeRequestSent, `WS ${destination} sent.`, {
        method: 'WS',
        apiPath: destination,
        traceId,
      });
    };

    const logRealtimeReceive = (traceId: string | undefined, destination: string): void => {
      if (!traceId || receivedTraceIds.has(traceId)) return;

      receivedTraceIds.add(traceId);
      clientLogService.info(ClientLogEventType.FeRequestReceived, `WS ${destination} received.`, {
        method: 'WS',
        apiPath: destination,
        traceId,
      });
    };

    const publishChatMessage = (conversationId: string, messageRequest: { messageType: ChatMessageType; content: string; attachments: unknown[] }): void => {
      const destination = `/app/chat/${conversationId}/send`;
      const traceId = generateTraceId();
      logRealtimeSend(traceId, destination);
      websocketService.publish(destination, { ...messageRequest, traceId });
    };

    const handleEvent = (event: ManagementChatEvent): void => {
      switch (event.type) {
        case ManagementChatEventType.WorkspaceLoadStarted:
          patchState(store, { loading: true, errorMessage: null });
          break;

        case ManagementChatEventType.WorkspaceLoadSucceeded:
          patchState(
            store,
            setAllEntities(event.workspace.conversations, CONVERSATION_ENTITY_CONFIG),
            setAllEntities(event.workspace.messages, MESSAGE_ENTITY_CONFIG),
            setAllEntities(event.workspace.mediaItems, MEDIA_ENTITY_CONFIG),
            {
              loading: false,
              errorMessage: null,
            }
          );
          break;

        case ManagementChatEventType.WorkspaceLoadFailed:
          patchState(store, {
            loading: false,
            errorMessage: 'Không thể tải không gian tư vấn khách hàng.',
          });
          break;

        case ManagementChatEventType.ConversationSelected:
          patchState(
            store,
            {
              selectedConversationId: event.conversationId,
              mediaDrawerOpen: false,
              messagesLoading: true,
            }
          );
          break;

        case ManagementChatEventType.SelectionCleared:
          patchState(store, {
            selectedConversationId: null,
            mediaDrawerOpen: false,
            activeMediaTab: 'ALL',
            messagesLoading: false,
          });
          break;

        case ManagementChatEventType.SearchKeywordChanged:
          patchState(store, { searchKeyword: event.searchKeyword });
          break;

        case ManagementChatEventType.MyHandlingFilterToggled:
          patchState(store, { myHandlingOnly: !store.myHandlingOnly() });
          break;

        case ManagementChatEventType.ArchiveFilterChanged:
          patchState(store, { archiveFilter: event.archiveFilter });
          break;

        case ManagementChatEventType.StatusFilterChanged:
          patchState(store, { statusFilter: event.statusFilter });
          break;

        case ManagementChatEventType.ExpertRequestFilterChanged:
          patchState(store, { expertRequestFilter: event.expertRequestFilter });
          break;

        case ManagementChatEventType.MediaDrawerToggled:
          patchState(store, { mediaDrawerOpen: event.open });
          break;

        case ManagementChatEventType.MediaDrawerOpened:
          patchState(store, { mediaDrawerOpen: true });
          break;

        case ManagementChatEventType.MediaDrawerClosed:
          patchState(store, { mediaDrawerOpen: false });
          break;

        case ManagementChatEventType.MediaTabChanged:
          patchState(store, { activeMediaTab: event.activeMediaTab });
          break;

        case ManagementChatEventType.ConversationAccepted:
          patchState(
            store,
            updateEntity(
              {
                id: event.conversationId,
                changes: { status: 'STAFF_HANDLING', expertRequestStatus: 'ACCEPTED' },
              },
              CONVERSATION_ENTITY_CONFIG
            )
          );
          break;

        case ManagementChatEventType.ConversationClosed:
          patchState(
            store,
            updateEntity(
              { id: event.conversationId, changes: { status: 'CLOSED', unreadCount: 0 } },
              CONVERSATION_ENTITY_CONFIG
            ),
            { mediaDrawerOpen: false }
          );
          break;

        case ManagementChatEventType.StaffMessageSubmitted:
          patchState(
            store,
            addEntity(event.message, MESSAGE_ENTITY_CONFIG),
            updateEntity(
              {
                id: event.conversation.id,
                changes: {
                  lastMessagePreview: event.message.body,
                  lastMessageAtLabel: event.message.sentAtLabel,
                  status:
                    event.conversation.status === 'CLOSED'
                      ? event.conversation.status
                      : 'STAFF_HANDLING',
                },
              },
              CONVERSATION_ENTITY_CONFIG
            )
          );
          break;
        case ManagementChatEventType.SearchRequested:
          patchState(store, {
            searchSidebarOpen: true,
            mediaDrawerOpen: false,
          });
          break;

        case ManagementChatEventType.SearchSidebarToggled:
          patchState(store, { searchSidebarOpen: event.searchSidebarOpen });
          break;

        case ManagementChatEventType.SearchMessagesStarted:
          patchState(store, { isSearching: true, searchResults: [] });
          break;

        case ManagementChatEventType.SearchMessagesSucceeded:
          patchState(store, { isSearching: false, searchResults: event.results });
          break;

        case ManagementChatEventType.SearchMessagesFailed:
          patchState(store, { isSearching: false, searchResults: [] });
          break;
      }
    };

    const loadConversationMessages = (conversationId: string, customerName: string) => {
      return managementChatService.getMessages(conversationId, 0, 100).pipe(
        tap((pageRes) => {
          const mappedMessages = (pageRes.content || []).map((m) =>
            mapToManagementChatMessage(m, customerName)
          );
          const mediaItems = (pageRes.content || []).flatMap((m) =>
            mapToManagementChatMediaItems(m)
          );
          const existingMessageIds = store.messages()
            .filter((message) => message.conversationId === conversationId)
            .map((message) => message.id);
          const existingMediaIds = store.mediaItems()
            .filter((mediaItem) => mediaItem.conversationId === conversationId)
            .map((mediaItem) => mediaItem.id);

          patchState(
            store,
            removeEntities(existingMessageIds, MESSAGE_ENTITY_CONFIG),
            addEntities(mappedMessages, MESSAGE_ENTITY_CONFIG),
            removeEntities(existingMediaIds, MEDIA_ENTITY_CONFIG),
            addEntities(mediaItems, MEDIA_ENTITY_CONFIG),
            { messagesLoading: false }
          );
        }),
        catchError(() => {
          patchState(store, { messagesLoading: false });
          return EMPTY;
        })
      );
    };

    const loadWorkspace = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: ManagementChatEventType.WorkspaceLoadStarted })),
        switchMap(() =>
          managementChatService.getWorkspace(0, 100).pipe(
            tap({
              next: workspace => {
                handleEvent({ type: ManagementChatEventType.WorkspaceLoadSucceeded, workspace });

                websocketService.connect();

                if (queueSub) {
                  queueSub.unsubscribe();
                }

                queueSub = websocketService
                  .subscribe<ConversationResponse | ChatConversationEventResponse>('/topic/management.chat.queue')
                  .subscribe((payload) => {
                    if ('eventType' in payload) {
                      const event = payload;
                      const shouldNotify = !!store.conversationEntities()
                        .find(item => item.id === event.conversationId)?.currentStaffActive;
                      if (event.eventType === 'DELETED') {
                        patchState(store, removeEntity(event.conversationId, CONVERSATION_ENTITY_CONFIG));
                        if (store.selectedConversationId() === event.conversationId) {
                          handleEvent({ type: ManagementChatEventType.SelectionCleared });
                        }
                        if (shouldNotify) patchState(store, { lifecycleNotice: 'Khách hàng đã xóa cuộc hội thoại.' });
                        return;
                      }
                      if (event.conversation) {
                        const mappedEventConversation = managementChatService.mapToManagementChatConversation(event.conversation);
                        const existing = store.conversationEntities().find(item => item.id === event.conversationId);
                        patchState(store, updateEntity({
                          id: event.conversationId,
                          changes: { ...mappedEventConversation, unreadCount: existing?.unreadCount ?? mappedEventConversation.unreadCount },
                        }, CONVERSATION_ENTITY_CONFIG));
                      }
                      if (shouldNotify) {
                        patchState(store, { lifecycleNotice: event.eventType === 'ARCHIVED'
                          ? 'Khách hàng đã lưu trữ cuộc hội thoại.'
                          : 'Khách hàng đã khôi phục cuộc hội thoại.' });
                      }
                      return;
                    }
                    const updatedConv = payload;
                    const mapped = managementChatService.mapToManagementChatConversation(updatedConv);
                    const exists = store.conversationEntities().some((c) => c.id === mapped.id);
                    if (exists) {
                      const current = store.conversationEntities().find(c => c.id === mapped.id);
                      patchState(
                        store,
                        updateEntity(
                          {
                            id: mapped.id,
                            changes: {
                              ...mapped,
                              unreadCount: store.selectedConversationId() === mapped.id
                                ? current?.unreadCount ?? 0
                                : (current?.unreadCount ?? 0) + 1,
                            },
                          },
                          CONVERSATION_ENTITY_CONFIG
                        )
                      );
                    } else {
                      patchState(
                        store,
                        addEntity(mapped, CONVERSATION_ENTITY_CONFIG)
                      );
                    }
                  });
              },
              error: () => handleEvent({ type: ManagementChatEventType.WorkspaceLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const selectConversation = rxMethod<string>(
      pipe(
        filter((id) => id !== store.selectedConversationId()),
        tap((id) => {
          handleEvent({ type: ManagementChatEventType.ConversationSelected, conversationId: id });

          if (messageSub) {
            messageSub.unsubscribe();
            messageSub = null;
          }
          if (conversationSub) {
            conversationSub.unsubscribe();
            conversationSub = null;
          }
        }),
        switchMap((id) => {
          const conv = store.conversationEntities().find((c) => c.id === id);
          const customerName = conv?.customer.fullName || 'Khách hàng';

          return loadConversationMessages(id, customerName).pipe(
            tap(() => {
              messageSub = websocketService
                .subscribe<ChatMessageResponse>(`/topic/conversations.${id}`)
                .subscribe((msg) => {
                  // Check if this is a chat message response, not a conversation status update
                  if (!msg || !msg.messageType) {
                    return;
                  }

                  logRealtimeReceive(msg.traceId, `/topic/conversations.${id}`);
                  if (msg.messageType as any === 'TEXT_STREAM_CHUNK') {
                    const streamingMsg = store.messages().find((m) => m.id === 'ai-streaming');
                    if (!streamingMsg) {
                      const newStreamMsg: ManagementChatMessage = {
                        id: 'ai-streaming',
                        conversationId: id,
                        sender: 'AI',
                        senderName: 'ZenTech AI',
                        messageType: ChatMessageType.TEXT,
                        body: msg.content || '',
                        sentAtLabel: formatTime(msg.createdAt || new Date().toISOString()),
                        attachments: [],
                      };
                      patchState(store, addEntity(newStreamMsg, MESSAGE_ENTITY_CONFIG));
                    } else {
                      const updatedStreamMsg = {
                        ...streamingMsg,
                        body: streamingMsg.body + (msg.content || ''),
                      };
                      patchState(store, updateEntity({ id: 'ai-streaming', changes: updatedStreamMsg }, MESSAGE_ENTITY_CONFIG));
                    }
                    return;
                  }

                  const exists = store.messages().some((existing) => existing.id === msg.id);
                  if (!exists) {
                    if (msg.senderType === ParticipantType.BOT) {
                      const streamingMsg = store.messages().find((m) => m.id === 'ai-streaming');
                      if (streamingMsg) {
                        patchState(store, removeEntity('ai-streaming', MESSAGE_ENTITY_CONFIG));
                      }
                    }
                    const mappedMsg = mapToManagementChatMessage(msg, customerName);
                    const mediaItems = mapToManagementChatMediaItems(msg);
                    patchState(
                      store,
                      addEntity(mappedMsg, MESSAGE_ENTITY_CONFIG),
                      addEntities(mediaItems, MEDIA_ENTITY_CONFIG)
                    );

                    patchState(
                      store,
                      updateEntity(
                        {
                          id: id,
                          changes: {
                            lastMessagePreview: msg.content || '',
                            lastMessageAtLabel: formatTime(msg.createdAt),
                          },
                        },
                        CONVERSATION_ENTITY_CONFIG
                      )
                    );
                  }
                });

              conversationSub = websocketService
                .subscribe<ConversationResponse | ChatConversationEventResponse>(`/topic/conversations.${id}`)
                .subscribe((updatedConv) => {
                  // Check if this is a conversation status update, not a chat message response
                  if (!updatedConv || 'eventType' in updatedConv || (updatedConv as any).messageType) {
                    return;
                  }

                  const mapped = managementChatService.mapToManagementChatConversation(updatedConv);
                  patchState(
                    store,
                    updateEntity(
                      { id: id, changes: { status: mapped.status } },
                      CONVERSATION_ENTITY_CONFIG
                    )
                  );
                });
            })
          );
        })
      )
    );

    const acceptConversation = rxMethod<void>(
      pipe(
        switchMap(() => {
          const conversationId = store.selectedConversationId();
          if (!conversationId) return EMPTY;

          return managementChatService.claimConversation(conversationId).pipe(
            tap((updatedConv) => {
              const mapped = managementChatService.mapToManagementChatConversation(updatedConv);
              patchState(
                store,
                updateEntity(
                  { id: conversationId, changes: mapped },
                  CONVERSATION_ENTITY_CONFIG
                )
              );
              handleEvent({ type: ManagementChatEventType.ConversationAccepted, conversationId });
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    const closeConversation = rxMethod<void>(
      pipe(
        switchMap(() => {
          const conversationId = store.selectedConversationId();
          if (!conversationId || !store.canManageSelectedConversation()) return EMPTY;

          return customerChatService.closeConversation(conversationId).pipe(
            tap((updatedConv) => {
              const mapped = managementChatService.mapToManagementChatConversation(updatedConv);
              patchState(
                store,
                updateEntity(
                  { id: conversationId, changes: mapped },
                  CONVERSATION_ENTITY_CONFIG
                )
              );
              handleEvent({ type: ManagementChatEventType.ConversationClosed, conversationId });
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    const leaveConversation = rxMethod<void>(
      pipe(
        switchMap(() => {
          const conversationId = store.selectedConversationId();
          if (!conversationId || !store.canManageSelectedConversation()) return EMPTY;

          patchState(store, { errorMessage: null });

          return managementChatService.leaveConversation(conversationId).pipe(
            tap((updatedConv) => {
              const mapped = managementChatService.mapToManagementChatConversation(updatedConv);
              patchState(
                store,
                updateEntity(
                  { id: conversationId, changes: mapped },
                  CONVERSATION_ENTITY_CONFIG
                ),
                {
                  messagesLoading: false,
                }
              );
            }),
            catchError(() => {
              patchState(store, {
                errorMessage: 'Không thể rời hội thoại. Vui lòng thử lại.',
              });
              return EMPTY;
            })
          );
        })
      )
    );

    const loadActiveStaffList = rxMethod<void>(
      pipe(
        switchMap(() =>
          managementChatService.getActiveStaffList().pipe(
            tap((activeStaffList) => {
              patchState(store, { activeStaffList });
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const transferConversation = rxMethod<string | null>(
      pipe(
        switchMap((toAccountId) => {
          const conversationId = store.selectedConversationId();
          if (!conversationId || !store.canManageSelectedConversation()) return EMPTY;

          patchState(store, { loading: true });

          return managementChatService.transferConversation(conversationId, toAccountId).pipe(
            tap((updatedConv) => {
              const mapped = managementChatService.mapToManagementChatConversation(updatedConv);
              patchState(
                store,
                updateEntity(
                  { id: conversationId, changes: mapped },
                  CONVERSATION_ENTITY_CONFIG
                ),
                { loading: false }
              );
            }),
            catchError(() => {
              patchState(store, { loading: false, errorMessage: 'Không thể chuyển tiếp hội thoại.' });
              return EMPTY;
            })
          );
        })
      )
    );

    const sendStaffMessage = rxMethod<string>(
      pipe(
        map((body) => body.trim()),
        switchMap((body) => {
          const conversationId = store.selectedConversationId();
          if (!conversationId || !store.canReplyToSelectedConversation()) {
            return EMPTY;
          }

          const pendingUploads = store.uploadEntities().filter(
            upload =>
              upload.conversationId === conversationId &&
              (upload.status === 'PENDING' || upload.status === 'FAILED')
          );

          if (!body && pendingUploads.length === 0) {
            return EMPTY;
          }

          if (pendingUploads.length === 0) {
            const messageRequest = {
              messageType: ChatMessageType.TEXT,
              content: body,
              attachments: [],
            };
            publishChatMessage(conversationId, messageRequest);
            return of(null);
          }

          const uploadIds = pendingUploads.map(upload => upload.id);
          patchState(
            store,
            updateEntities(
              {
                predicate: upload => uploadIds.includes(upload.id),
                changes: { progress: 35, status: 'UPLOADING' },
              },
              UPLOAD_ENTITY_CONFIG
            ),
            { errorMessage: null }
          );

          const uploadRequests = pendingUploads.map(upload =>
            customerChatService.uploadFile(upload.file).pipe(
              map(result => ({
                uploadId: upload.id,
                attachment: {
                  fileKey: result.fileKey,
                  fileName: result.fileName,
                  contentType: result.contentType,
                  fileSize: result.fileSize,
                  attachmentType: result.attachmentType,
                },
              }))
            )
          );

          return forkJoin(uploadRequests).pipe(
            tap({
              next: results => {
                const attachments = results.map(result => result.attachment);
                const firstAttachmentType = attachments[0]?.attachmentType ?? null;
                websocketService.publish(`/app/chat/${conversationId}/send`, {
                  messageType: mapOutgoingMessageType(firstAttachmentType, attachments.length),
                  content: body || attachments.map(attachment => attachment.fileName).join(', '),
                  attachments,
                });
                patchState(store, removeEntities(uploadIds, UPLOAD_ENTITY_CONFIG));
              },
              error: () => {
                patchState(
                  store,
                  updateEntities(
                    {
                      predicate: upload => uploadIds.includes(upload.id),
                      changes: { status: 'FAILED', progress: 100 },
                    },
                    UPLOAD_ENTITY_CONFIG
                  ),
                  { errorMessage: 'Không thể tải tệp lên. Vui lòng thử lại.' }
                );
              },
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    const selectStaffFiles = rxMethod<File[]>(
      pipe(
        tap(files => {
          const conversationId = store.selectedConversationId();
          if (
            !conversationId ||
            !store.canReplyToSelectedConversation() ||
            files.length === 0
          ) {
            return;
          }

          const uploads: ManagementChatUpload[] = files.map(file => ({
            id: `staff-upload-${conversationId}-${Date.now()}-${file.name}`,
            conversationId,
            file,
            fileName: file.name,
            sizeLabel: formatBytes(file.size),
            progress: 0,
            status: 'PENDING',
          }));

          patchState(store, addEntities(uploads, UPLOAD_ENTITY_CONFIG));
        })
      )
    );

    const searchMessages = rxMethod<string>(
      pipe(
        tap(() => handleEvent({ type: ManagementChatEventType.SearchMessagesStarted })),
        switchMap((keyword) => {
          const conversationId = store.selectedConversationId();
          if (!conversationId || !keyword.trim()) {
            handleEvent({ type: ManagementChatEventType.SearchMessagesSucceeded, results: [] });
            return EMPTY;
          }
          return customerChatService.searchMessages(conversationId, keyword).pipe(
            tap({
              next: (results) => {
                handleEvent({ type: ManagementChatEventType.SearchMessagesSucceeded, results: results.content || [] });
              },
              error: () => {
                handleEvent({ type: ManagementChatEventType.SearchMessagesFailed });
              }
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    const jumpToMessage = rxMethod<string>(
      pipe(
        tap(() => {
          patchState(store, { loading: true, searchSidebarOpen: false });
        }),
        switchMap((messageId) => {
          const conversationId = store.selectedConversationId();
          if (!conversationId) return EMPTY;

          const exists = store.messages().some((m) => m.id === messageId);
          if (exists) {
            patchState(store, { loading: false, highlightedMessageId: messageId });
            return of(messageId);
          }

          return customerChatService.getMessageContext(conversationId, messageId).pipe(
            tap({
              next: (messages) => {
                const conv = store.selectedConversation();
                if (conv) {
                  const customerName = conv.customer.fullName || 'Khách hàng';
                  const mappedMessages = messages.map((m) =>
                    mapToManagementChatMessage(m, customerName)
                  );
                  const mediaItems = messages.flatMap((m) =>
                    mapToManagementChatMediaItems(m)
                  );
                  patchState(
                    store,
                    setAllEntities(mappedMessages, MESSAGE_ENTITY_CONFIG),
                    setAllEntities(mediaItems, MEDIA_ENTITY_CONFIG),
                    {
                      loading: false,
                      highlightedMessageId: messageId,
                    }
                  );
                }
              },
              error: () => patchState(store, { loading: false }),
            }),
            catchError(() => {
              patchState(store, { loading: false });
              return EMPTY;
            })
          );
        })
      )
    );

    const clearHighlightedMessage = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { highlightedMessageId: null }))
      )
    );

    const markSelectedConversationRead = rxMethod<void>(
      pipe(
        switchMap(() => {
          const conversationId = store.selectedConversationId();
          if (!conversationId) return EMPTY;
          return managementChatService.markConversationRead(conversationId).pipe(
            tap(() => patchState(store, updateEntity(
              { id: conversationId, changes: { unreadCount: 0 } },
              CONVERSATION_ENTITY_CONFIG
            ))),
            catchError(() => EMPTY)
          );
        })
      )
    );

    return {
      dispatch: handleEvent,
      loadWorkspace,
      selectConversation,
      clearSelection(): void {
        if (messageSub) {
          messageSub.unsubscribe();
          messageSub = null;
        }
        if (conversationSub) {
          conversationSub.unsubscribe();
          conversationSub = null;
        }
        handleEvent({ type: ManagementChatEventType.SelectionCleared });
      },
      setSearchKeyword(searchKeyword: string): void {
        handleEvent({ type: ManagementChatEventType.SearchKeywordChanged, searchKeyword });
      },
      toggleMyHandlingFilter(): void {
        handleEvent({ type: ManagementChatEventType.MyHandlingFilterToggled });
      },
      setArchiveFilter(archiveFilter: ManagementChatArchiveFilter): void {
        handleEvent({ type: ManagementChatEventType.ArchiveFilterChanged, archiveFilter });
      },
      setStatusFilter(statusFilter: ManagementChatStatusFilter): void {
        handleEvent({
          type: ManagementChatEventType.StatusFilterChanged,
          statusFilter: store.statusFilter() === statusFilter ? 'ALL' : statusFilter,
        });
      },
      setExpertRequestFilter(expertRequestFilter: ManagementChatExpertRequestFilter): void {
        handleEvent({
          type: ManagementChatEventType.ExpertRequestFilterChanged,
          expertRequestFilter:
            store.expertRequestFilter() === expertRequestFilter ? 'ALL' : expertRequestFilter,
        });
      },
      toggleMediaDrawer(): void {
        handleEvent({
          type: ManagementChatEventType.MediaDrawerToggled,
          open: !store.mediaDrawerOpen(),
        });
      },
      openMediaDrawer(): void {
        handleEvent({ type: ManagementChatEventType.MediaDrawerOpened });
      },
      closeMediaDrawer(): void {
        handleEvent({ type: ManagementChatEventType.MediaDrawerClosed });
      },
      toggleSearchSidebar(): void {
        handleEvent({
          type: ManagementChatEventType.SearchSidebarToggled,
          searchSidebarOpen: !store.searchSidebarOpen(),
        });
      },
      closeSearchSidebar(): void {
        handleEvent({
          type: ManagementChatEventType.SearchSidebarToggled,
          searchSidebarOpen: false,
        });
      },
      setMediaTab(activeMediaTab: ManagementChatMediaTab): void {
        handleEvent({ type: ManagementChatEventType.MediaTabChanged, activeMediaTab });
      },
      acceptConversation,
      closeConversation,
      leaveConversation,
      loadActiveStaffList,
      transferConversation,
      sendStaffMessage,
      selectStaffFiles,
      searchMessages,
      jumpToMessage,
      clearHighlightedMessage,
      markSelectedConversationRead,
      clearLifecycleNotice(): void {
        patchState(store, { lifecycleNotice: null });
      },
      removeStaffUpload(uploadId: string): void {
        patchState(store, removeEntity(uploadId, UPLOAD_ENTITY_CONFIG));
      },
    };
  }),
  withHooks((store) => {
    const ws = inject(CustomerChatWebsocketService);
    return {
      onDestroy() {
        ws.disconnect();
      },
    };
  })
);

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
