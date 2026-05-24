import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  removeAllEntities,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, Subscription, catchError, pipe, switchMap, tap, map } from 'rxjs';
import { OwnerChatEvent, OwnerChatEventType } from '../models/owner-chat.event';
import {
  OwnerChatConversation,
  OwnerChatConversationStatus,
  OwnerChatExpertRequestFilter,
  OwnerChatExpertRequestStatus,
  OwnerChatMediaItem,
  OwnerChatMediaTab,
  OwnerChatMessage,
  OwnerChatStatusFilter,
  OwnerChatWorkspace,
} from '../models/owner-chat.models';
import { OwnerChatService } from '../services/owner-chat.service';
import { CustomerChatService } from '../../../../customer-chat/data-access/services/customer-chat.service';
import { CustomerChatWebsocketService } from '../../../../customer-chat/data-access/services/customer-chat-websocket.service';
import {
  ChatMessageResponse,
  ConversationResponse,
  ConversationStatus,
  ParticipantType,
  formatTime,
  ChatMessageType,
} from '../../../../customer-chat/data-access/models/customer-chat.models';

interface OwnerChatUiState {
  selectedConversationId: string | null;
  statusFilter: OwnerChatStatusFilter;
  expertRequestFilter: OwnerChatExpertRequestFilter;
  searchKeyword: string;
  activeMediaTab: OwnerChatMediaTab;
  mediaDrawerOpen: boolean;
  loading: boolean;
  errorMessage: string | null;
}

const CONVERSATION_ENTITY_CONFIG = {
  collection: 'conversation',
  selectId: (conversation: OwnerChatConversation) => conversation.id,
} as const;

const MESSAGE_ENTITY_CONFIG = {
  collection: 'message',
  selectId: (message: OwnerChatMessage) => message.id,
} as const;

const MEDIA_ENTITY_CONFIG = {
  collection: 'media',
  selectId: (mediaItem: OwnerChatMediaItem) => mediaItem.id,
} as const;

const INITIAL_STATE: OwnerChatUiState = {
  selectedConversationId: null,
  statusFilter: 'ALL',
  expertRequestFilter: 'ALL',
  searchKeyword: '',
  activeMediaTab: 'ALL',
  mediaDrawerOpen: false,
  loading: false,
  errorMessage: null,
};

const STATUS_LABELS: Record<OwnerChatConversationStatus, string> = {
  AI_ASSISTING: 'AI đang tư vấn',
  WAITING_STAFF: 'Đang chờ nhân viên',
  STAFF_HANDLING: 'Nhân viên đang xử lý',
  CLOSED: 'Đã đóng',
};

const EXPERT_REQUEST_LABELS: Record<OwnerChatExpertRequestStatus, string> = {
  WAITING: 'Đang chờ phản hồi',
  ACCEPTED: 'Đã chấp nhận',
  DECLINED: 'Đã từ chối',
  CANCELLED: 'Đã bị hủy',
};

function mapToOwnerChatMessage(
  m: ChatMessageResponse,
  customerName: string
): OwnerChatMessage {
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
    body: m.content || '',
    sentAtLabel: formatTime(m.createdAt),
  };
}

export const OwnerChatStore = signalStore(
  withState<OwnerChatUiState>(INITIAL_STATE),
  withEntities<OwnerChatConversation, 'conversation'>({
    entity: {} as OwnerChatConversation,
    collection: 'conversation',
  }),
  withEntities<OwnerChatMessage, 'message'>({
    entity: {} as OwnerChatMessage,
    collection: 'message',
  }),
  withEntities<OwnerChatMediaItem, 'media'>({
    entity: {} as OwnerChatMediaItem,
    collection: 'media',
  }),
  withComputed(
    ({
      conversationEntities,
      messageEntities,
      mediaEntities,
      selectedConversationId,
      statusFilter,
      expertRequestFilter,
      searchKeyword,
      activeMediaTab,
    }) => ({
      conversations: computed(() => conversationEntities()),
      messages: computed(() => messageEntities()),
      mediaItems: computed(() => mediaEntities()),
      filteredConversations: computed(() => {
        const normalizedKeyword = normalize(searchKeyword());

        return conversationEntities().filter(conversation => {
          const matchesStatus =
            statusFilter() === 'ALL' || conversation.status === statusFilter();
          const matchesExpertRequest =
            expertRequestFilter() === 'ALL' ||
            conversation.expertRequestStatus === expertRequestFilter();
          const searchableText = normalize(
            `${conversation.customer.fullName} ${conversation.lastMessagePreview} ${conversation.productContext}`
          );
          const matchesKeyword =
            !normalizedKeyword || searchableText.includes(normalizedKeyword);

          return matchesStatus && matchesExpertRequest && matchesKeyword;
        });
      }),
      selectedConversation: computed(
        () =>
          conversationEntities().find(conversation => conversation.id === selectedConversationId()) ??
          null
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
        (Object.keys(STATUS_LABELS) as OwnerChatConversationStatus[]).map(status => ({
          status,
          label: STATUS_LABELS[status],
          count: conversationEntities().filter(conversation => conversation.status === status)
            .length,
        }))
      ),
      expertRequestCounts: computed(() =>
        (Object.keys(EXPERT_REQUEST_LABELS) as OwnerChatExpertRequestStatus[]).map(status => ({
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
    ownerChatService = inject(OwnerChatService),
    customerChatService = inject(CustomerChatService),
    websocketService = inject(CustomerChatWebsocketService)
  ) => {
    let queueSub: Subscription | null = null;
    let messageSub: Subscription | null = null;
    let conversationSub: Subscription | null = null;

    const handleEvent = (event: OwnerChatEvent): void => {
      switch (event.type) {
        case OwnerChatEventType.WorkspaceLoadStarted:
          patchState(store, { loading: true, errorMessage: null });
          break;

        case OwnerChatEventType.WorkspaceLoadSucceeded:
          patchState(
            store,
            setAllEntities(event.workspace.conversations, CONVERSATION_ENTITY_CONFIG),
            setAllEntities(event.workspace.messages, MESSAGE_ENTITY_CONFIG),
            setAllEntities(event.workspace.mediaItems, MEDIA_ENTITY_CONFIG),
            {
              selectedConversationId: null,
              loading: false,
              errorMessage: null,
            }
          );
          break;

        case OwnerChatEventType.WorkspaceLoadFailed:
          patchState(store, {
            loading: false,
            errorMessage: 'Không thể tải không gian tư vấn khách hàng.',
          });
          break;

        case OwnerChatEventType.ConversationSelected:
          patchState(
            store,
            updateEntity(
              { id: event.conversationId, changes: { unreadCount: 0 } },
              CONVERSATION_ENTITY_CONFIG
            ),
            {
              selectedConversationId: event.conversationId,
              mediaDrawerOpen: false,
            }
          );
          break;

        case OwnerChatEventType.SelectionCleared:
          patchState(store, {
            selectedConversationId: null,
            mediaDrawerOpen: false,
            activeMediaTab: 'ALL',
          });
          break;

        case OwnerChatEventType.SearchKeywordChanged:
          patchState(store, { searchKeyword: event.searchKeyword });
          break;

        case OwnerChatEventType.StatusFilterChanged:
          patchState(store, { statusFilter: event.statusFilter });
          break;

        case OwnerChatEventType.ExpertRequestFilterChanged:
          patchState(store, { expertRequestFilter: event.expertRequestFilter });
          break;

        case OwnerChatEventType.MediaDrawerToggled:
          patchState(store, { mediaDrawerOpen: event.open });
          break;

        case OwnerChatEventType.MediaDrawerOpened:
          patchState(store, { mediaDrawerOpen: true });
          break;

        case OwnerChatEventType.MediaDrawerClosed:
          patchState(store, { mediaDrawerOpen: false });
          break;

        case OwnerChatEventType.MediaTabChanged:
          patchState(store, { activeMediaTab: event.activeMediaTab });
          break;

        case OwnerChatEventType.ConversationAccepted:
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

        case OwnerChatEventType.ConversationClosed:
          patchState(
            store,
            updateEntity(
              { id: event.conversationId, changes: { status: 'CLOSED', unreadCount: 0 } },
              CONVERSATION_ENTITY_CONFIG
            ),
            { mediaDrawerOpen: false }
          );
          break;

        case OwnerChatEventType.StaffMessageSubmitted:
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
      }
    };

    const loadConversationMessages = (conversationId: string, customerName: string) => {
      return customerChatService.getMessages(conversationId, 0, 100).pipe(
        tap((pageRes) => {
          const mappedMessages = (pageRes.content || []).map((m) =>
            mapToOwnerChatMessage(m, customerName)
          );
          patchState(
            store,
            setAllEntities(mappedMessages, MESSAGE_ENTITY_CONFIG)
          );
        }),
        catchError(() => EMPTY)
      );
    };

    const loadWorkspace = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: OwnerChatEventType.WorkspaceLoadStarted })),
        switchMap(() =>
          ownerChatService.getWorkspace(0, 100).pipe(
            tap({
              next: workspace => {
                handleEvent({ type: OwnerChatEventType.WorkspaceLoadSucceeded, workspace });

                websocketService.connect();

                if (queueSub) {
                  queueSub.unsubscribe();
                }

                queueSub = websocketService
                  .subscribe<ConversationResponse>('/topic/owner.chat.queue')
                  .subscribe((updatedConv) => {
                    const mapped = ownerChatService.mapToOwnerChatConversation(updatedConv);
                    const exists = store.conversationEntities().some((c) => c.id === mapped.id);
                    if (exists) {
                      patchState(
                        store,
                        updateEntity(
                          { id: mapped.id, changes: mapped },
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
              error: () => handleEvent({ type: OwnerChatEventType.WorkspaceLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const selectConversation = rxMethod<string>(
      pipe(
        tap((id) => {
          handleEvent({ type: OwnerChatEventType.ConversationSelected, conversationId: id });

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
                  const exists = store.messages().some((existing) => existing.id === msg.id);
                  if (!exists) {
                    const mappedMsg = mapToOwnerChatMessage(msg, customerName);
                    patchState(
                      store,
                      addEntity(mappedMsg, MESSAGE_ENTITY_CONFIG)
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
                .subscribe<ConversationResponse>(`/topic/conversations.${id}`)
                .subscribe((updatedConv) => {
                  const mapped = ownerChatService.mapToOwnerChatConversation(updatedConv);
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

          return ownerChatService.claimConversation(conversationId).pipe(
            tap((updatedConv) => {
              const mapped = ownerChatService.mapToOwnerChatConversation(updatedConv);
              patchState(
                store,
                updateEntity(
                  { id: conversationId, changes: mapped },
                  CONVERSATION_ENTITY_CONFIG
                )
              );
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
          if (!conversationId) return EMPTY;

          return customerChatService.closeConversation(conversationId).pipe(
            tap((updatedConv) => {
              const mapped = ownerChatService.mapToOwnerChatConversation(updatedConv);
              patchState(
                store,
                updateEntity(
                  { id: conversationId, changes: mapped },
                  CONVERSATION_ENTITY_CONFIG
                )
              );
              handleEvent({ type: OwnerChatEventType.ConversationClosed, conversationId });
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    const sendStaffMessage = rxMethod<string>(
      pipe(
        map((body) => body.trim()),
        tap((body) => {
          const conversationId = store.selectedConversationId();
          if (conversationId && body) {
            const messageRequest = {
              messageType: ChatMessageType.TEXT,
              content: body,
              attachments: [],
            };
            websocketService.publish(`/app/chat/${conversationId}/send`, messageRequest);
          }
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
        handleEvent({ type: OwnerChatEventType.SelectionCleared });
      },
      setSearchKeyword(searchKeyword: string): void {
        handleEvent({ type: OwnerChatEventType.SearchKeywordChanged, searchKeyword });
      },
      setStatusFilter(statusFilter: OwnerChatStatusFilter): void {
        handleEvent({ type: OwnerChatEventType.StatusFilterChanged, statusFilter });
      },
      setExpertRequestFilter(expertRequestFilter: OwnerChatExpertRequestFilter): void {
        handleEvent({
          type: OwnerChatEventType.ExpertRequestFilterChanged,
          expertRequestFilter,
        });
      },
      toggleMediaDrawer(): void {
        handleEvent({
          type: OwnerChatEventType.MediaDrawerToggled,
          open: !store.mediaDrawerOpen(),
        });
      },
      openMediaDrawer(): void {
        handleEvent({ type: OwnerChatEventType.MediaDrawerOpened });
      },
      closeMediaDrawer(): void {
        handleEvent({ type: OwnerChatEventType.MediaDrawerClosed });
      },
      setMediaTab(activeMediaTab: OwnerChatMediaTab): void {
        handleEvent({ type: OwnerChatEventType.MediaTabChanged, activeMediaTab });
      },
      acceptConversation,
      closeConversation,
      sendStaffMessage,
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
