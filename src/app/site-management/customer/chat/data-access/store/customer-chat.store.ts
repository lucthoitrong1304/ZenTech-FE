import { computed, effect, inject } from '@angular/core';
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
import { EMPTY, Subscription, catchError, filter, forkJoin, map, of, pipe, switchMap, tap } from 'rxjs';
import { AuthStorageService } from '@/core/services/auth-storage.service';
import { ClientLogEventType } from '@/core/observability/logging/client-log.model';
import { ClientLogService } from '@/core/observability/logging/client-log.service';
import { generateTraceId } from '@/core/observability/tracing/trace-id.util';
import { Role } from '@/site-management/identity/data-access/models/auth.enums';
import { hasRole } from '@/site-management/identity/data-access/utils/auth-role.utils';
import { AuthSessionStore } from '@/site-management/identity/data-access/store/auth-session.store';
import { CustomerChatEvent, CustomerChatEventType } from '@/site-management/shared/chat/data-access/models/customer-chat.event';
import {
  ChatAttachmentType,
  ChatMessageRequestPayload,
  ChatMessageResponse,
  ChatConversationEventResponse,
  ChatMessageType,
  ConversationResponse,
  CustomerChatConversationArchiveFilter,
  CustomerChatPageContext,
  ConversationStatus,
  CustomerChatFullSidebarMode,
  CustomerChatMessage,
  CustomerChatMessageSender,
  CustomerChatSession,
  CustomerChatSessionStatus,
  CustomerChatSharedItem,
  CustomerChatSharedItemType,
  CustomerChatSharedTab,
  CustomerChatUpload,
  CustomerTicketStatus,
  ParticipantStatus,
  ParticipantType,
  formatBytes,
  formatTime,
  mapToCustomerChatSession,
} from '@/site-management/shared/chat/data-access/models/customer-chat.models';
import { CustomerChatService } from '@/site-management/shared/chat/data-access/services/customer-chat.service';
import { CustomerChatWebsocketService } from '@/site-management/shared/chat/data-access/services/customer-chat-websocket.service';

const sortConversations = (conversations: ConversationResponse[]): ConversationResponse[] =>
  [...conversations].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

interface CustomerChatUiState {
  session: CustomerChatSession | null;
  conversations: ConversationResponse[];
  activeConversationId: string | null;
  activeSharedTab: CustomerChatSharedTab;
  fullSidebarMode: CustomerChatFullSidebarMode;
  conversationArchiveFilter: CustomerChatConversationArchiveFilter;
  popupOpen: boolean;
  sharedSidebarOpen: boolean;
  requiresLogin: boolean;
  loading: boolean;
  sending: boolean;
  aiResponding: boolean;
  errorMessage: string | null;
  lastActivityLabel: string;
  searchSidebarOpen: boolean;
  searchKeyword: string;
  searchResults: ChatMessageResponse[];
  isSearching: boolean;
  highlightedMessageId: string | null;
  lifecycleNotice: string | null;
  customerTicketStatus: CustomerTicketStatus | null;
  pageContext: CustomerChatPageContext | null;
  dismissedTicketCode: string | null;
  dismissedTicketStatus: string | null;
}

const MESSAGE_ENTITY_CONFIG = {
  collection: 'message',
  selectId: (message: CustomerChatMessage) => message.id,
} as const;

const SHARED_ITEM_ENTITY_CONFIG = {
  collection: 'sharedItem',
  selectId: (item: CustomerChatSharedItem) => item.id,
} as const;

const UPLOAD_ENTITY_CONFIG = {
  collection: 'upload',
  selectId: (upload: CustomerChatUpload) => upload.id,
} as const;

const INITIAL_STATE: CustomerChatUiState = {
  session: null,
  conversations: [],
  activeConversationId: null,
  activeSharedTab: 'MEDIA',
  fullSidebarMode: 'DETAILS',
  conversationArchiveFilter: 'ACTIVE',
  popupOpen: false,
  sharedSidebarOpen: false,
  requiresLogin: false,
  loading: false,
  sending: false,
  aiResponding: false,
  errorMessage: null,
  lastActivityLabel: '',
  searchSidebarOpen: false,
  searchKeyword: '',
  searchResults: [],
  isSearching: false,
  highlightedMessageId: null,
  lifecycleNotice: null,
  customerTicketStatus: null,
  pageContext: null,
  dismissedTicketCode: null,
  dismissedTicketStatus: null,
};

export const CustomerChatStore = signalStore(
  withState<CustomerChatUiState>(INITIAL_STATE),
  withEntities<CustomerChatMessage, 'message'>({
    entity: {} as CustomerChatMessage,
    collection: 'message',
  }),
  withEntities<CustomerChatSharedItem, 'sharedItem'>({
    entity: {} as CustomerChatSharedItem,
    collection: 'sharedItem',
  }),
  withEntities<CustomerChatUpload, 'upload'>({
    entity: {} as CustomerChatUpload,
    collection: 'upload',
  }),
  withComputed(
    ({
      session,
      messageEntities,
      sharedItemEntities,
      uploadEntities,
      conversations,
      activeConversationId,
      activeSharedTab,
      pageContext,
      customerTicketStatus,
      dismissedTicketCode,
      dismissedTicketStatus,
    }) => ({
      activeTicketStatusToShow: computed(() => {
        const ticketStatus = customerTicketStatus();
        if (!ticketStatus) {
          return null;
        }
        if (ticketStatus.status === 'CLOSED') {
          return null;
        }
        const code = ticketStatus.ticketCode;
        if (code && code === dismissedTicketCode() && ticketStatus.status === dismissedTicketStatus()) {
          return null;
        }
        return ticketStatus;
      }),
      messages: computed(() => messageEntities()),
      activeConversationArchived: computed(() => {
        const id = activeConversationId();
        return !!id && conversations().some((conversation) => conversation.id === id && conversation.archived);
      }),
      sharedItems: computed(() => sharedItemEntities()),
      sharedMediaItems: computed(() =>
        sharedItemEntities().filter((item) => item.type === 'IMAGE' || item.type === 'VIDEO')
      ),
      sharedFileItems: computed(() => sharedItemEntities().filter((item) => item.type === 'FILE')),
      sharedLinkItems: computed(() => sharedItemEntities().filter((item) => item.type === 'LINK')),
      uploads: computed(() => {
        const conversationId = activeConversationId();
        return conversationId
          ? uploadEntities().filter((upload) => upload.conversationId === conversationId)
          : [];
      }),
      hasPendingAttachments: computed(() => {
        const conversationId = activeConversationId();
        return !!conversationId && uploadEntities().some((upload) =>
          upload.conversationId === conversationId &&
          (upload.status === 'PENDING' || upload.status === 'FAILED')
        );
      }),
      customer: computed(() => session()?.customer ?? null),
      assistant: computed(() => session()?.assistant ?? null),
      staff: computed(() => session()?.staff ?? null),
      product: computed(() => session()?.product ?? null),
      staffJoined: computed(
        () =>
          session()?.status === ('AGENT_HANDLING' as unknown as CustomerChatSessionStatus) &&
          session()?.staff !== null
      ),
      selectedSharedItems: computed(() =>
        sharedItemEntities().filter((item) => {
          switch (activeSharedTab()) {
            case 'ALL':
              return true;
            case 'MEDIA':
              return item.type === 'IMAGE' || item.type === 'VIDEO';
            case 'FILES':
              return item.type === 'FILE';
            case 'LINKS':
              return item.type === 'LINK';
          }
        })
      ),
      sharedCounts: computed(() => {
        const items = sharedItemEntities();

        return {
          all: items.length,
          media: items.filter((item) => item.type === 'IMAGE' || item.type === 'VIDEO').length,
          files: items.filter((item) => item.type === 'FILE').length,
          links: items.filter((item) => item.type === 'LINK').length,
        };
      }),
      hasActiveUploads: computed(() =>
        uploadEntities().some(
          (upload) =>
            upload.conversationId === activeConversationId() && upload.status === 'UPLOADING'
        )
      ),
    })
  ),
  withMethods(
    (
      store,
      customerChatService = inject(CustomerChatService),
      websocketService = inject(CustomerChatWebsocketService),
      authStorageService = inject(AuthStorageService),
      clientLogService = inject(ClientLogService)
    ) => {
      let messageSub: Subscription | null = null;
      let customerQueueSub: Subscription | null = null;
      const receivedTraceIds = new Set<string>();
      let conversationSub: Subscription | null = null;
      let ticketStatusSub: Subscription | null = null;

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

      const publishChatMessage = (conversationId: string, messageRequest: ChatMessageRequestPayload): void => {
        const destination = `/app/chat/${conversationId}/send`;
        const traceId = generateTraceId();
        logRealtimeSend(traceId, destination);
        websocketService.publish(destination, { ...messageRequest, traceId });
      };

      const isStaffSession = (): boolean => {
        const roles = authStorageService.getSession()?.roles ?? [];

        return (
          hasRole(roles, Role.OWNER) ||
          hasRole(roles, Role.MANAGER) ||
          hasRole(roles, Role.EMPLOYEE) ||
          hasRole(roles, Role.ADMIN)
        );
      };

      const hasCustomerSession = (): boolean =>
        !!authStorageService.getSession() && authStorageService.isAuthenticated();

      const handleEvent = (event: CustomerChatEvent): void => {
        switch (event.type) {
          case CustomerChatEventType.SessionLoadStarted:
            patchState(store, { loading: true, errorMessage: null, requiresLogin: false });
            break;

          case CustomerChatEventType.SessionLoadSucceeded:
            patchState(
              store,
              setAllEntities(event.session.messages, MESSAGE_ENTITY_CONFIG),
              setAllEntities(event.session.sharedItems, SHARED_ITEM_ENTITY_CONFIG),
              {
                session: event.session,
                lastActivityLabel: event.session.lastActivityLabel,
                loading: false,
                aiResponding: false,
                requiresLogin: false,
                errorMessage: null,
              }
            );
            break;

          case CustomerChatEventType.SessionLoadFailed:
            patchState(store, {
              loading: false,
              aiResponding: false,
              errorMessage: 'Không thể tải cuộc trò chuyện. Vui lòng thử lại sau.',
            });
            break;

          case CustomerChatEventType.CustomerMessageQueued:
            patchState(store, addEntity(event.message, MESSAGE_ENTITY_CONFIG), {
              sending: true,
              lastActivityLabel: event.message.sentAtLabel,
            });
            break;

          case CustomerChatEventType.CustomerMessageResponded:
            patchState(store, addEntity(event.message, MESSAGE_ENTITY_CONFIG), {
              sending: false,
              lastActivityLabel: event.message.sentAtLabel,
            });
            break;

          case CustomerChatEventType.CustomerMessageFailed:
            patchState(store, {
              sending: false,
              aiResponding: false,
              errorMessage: 'Tin nhắn chưa gửi được. Vui lòng thử lại.',
            });
            break;

          case CustomerChatEventType.UploadsQueued:
            patchState(store, addEntities(event.uploads, UPLOAD_ENTITY_CONFIG));
            break;

          case CustomerChatEventType.UploadsSucceeded:
            patchState(
              store,
              updateEntities(
                {
                  predicate: (upload) => event.uploadFileNames.includes(upload.fileName),
                  changes: { progress: 100, status: 'COMPLETE' },
                },
                UPLOAD_ENTITY_CONFIG
              ),
              addEntities(event.sharedItems, SHARED_ITEM_CONFIG),
              {
                activeSharedTab: event.activeSharedTab,
                fullSidebarMode: 'SHARED',
                sharedSidebarOpen: true,
              }
            );
            break;

          case CustomerChatEventType.UploadsFailed:
            patchState(
              store,
              updateEntities(
                {
                  predicate: (upload) =>
                    upload.conversationId === event.conversationId &&
                    upload.status === 'UPLOADING',
                  changes: { status: 'FAILED', progress: 100 },
                },
                UPLOAD_ENTITY_CONFIG
              ),
              { errorMessage: 'Không thể tải tệp lên. Vui lòng thử lại.' }
            );
            break;

          case CustomerChatEventType.PopupOpened:
            patchState(store, {
              activeSharedTab: 'MEDIA',
              popupOpen: true,
              sharedSidebarOpen: false,
              requiresLogin: false,
            });
            break;

          case CustomerChatEventType.PopupClosed:
            patchState(store, { popupOpen: false });
            break;

          case CustomerChatEventType.PopupToggled:
            patchState(store, { popupOpen: event.popupOpen });
            break;

          case CustomerChatEventType.FullChatOpened:
            patchState(store, {
              popupOpen: false,
              activeSharedTab: 'ALL',
              fullSidebarMode: 'DETAILS',
            });
            break;

          case CustomerChatEventType.SharedContentRequested:
            patchState(store, {
              activeSharedTab: 'ALL',
              fullSidebarMode: 'SHARED',
            });
            break;

          case CustomerChatEventType.ConversationDetailsRequested:
            patchState(store, { fullSidebarMode: 'DETAILS' });
            break;

          case CustomerChatEventType.UploadRemoved:
            patchState(store, removeEntity(event.uploadId, UPLOAD_ENTITY_CONFIG));
            break;

          case CustomerChatEventType.SharedContentTabChanged:
            patchState(store, {
              activeSharedTab: event.activeSharedTab,
              fullSidebarMode: 'SHARED',
              sharedSidebarOpen: true,
            });
            break;

          case CustomerChatEventType.SharedSidebarToggled:
            patchState(store, { sharedSidebarOpen: event.sharedSidebarOpen });
            break;

          case CustomerChatEventType.SharedSidebarClosed:
            patchState(store, { sharedSidebarOpen: false });
            break;

          case CustomerChatEventType.SearchRequested:
            patchState(store, {
              searchSidebarOpen: true,
              fullSidebarMode: 'SEARCH',
              sharedSidebarOpen: false,
              searchKeyword: '',
              searchResults: [],
            });
            break;

          case CustomerChatEventType.SearchSidebarToggled:
            const isOpen = event.searchSidebarOpen;
            patchState(store, {
              searchSidebarOpen: isOpen,
              fullSidebarMode: isOpen ? 'SEARCH' : 'DETAILS',
              sharedSidebarOpen: false,
            });
            break;

          case CustomerChatEventType.SearchMessagesStarted:
            patchState(store, { isSearching: true, errorMessage: null });
            break;

          case CustomerChatEventType.SearchMessagesSucceeded:
            patchState(store, {
              isSearching: false,
              searchResults: event.results,
              errorMessage: null,
            });
            break;

          case CustomerChatEventType.SearchMessagesFailed:
            patchState(store, {
              isSearching: false,
              errorMessage: 'Không thể tìm kiếm tin nhắn.',
            });
            break;
        }
      };

      const SHARED_ITEM_CONFIG = SHARED_ITEM_ENTITY_CONFIG;

      const mapMessageType = (
        attachmentType: ChatAttachmentType | null,
        attachmentCount: number
      ): ChatMessageType => {
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
      };

      const withPageContext = (
        payload: Omit<ChatMessageRequestPayload, 'pageContext'>
      ): ChatMessageRequestPayload => {
        const context = store.pageContext();
        return context ? { ...payload, pageContext: context } : payload;
      };

      const getActiveConversation = (): ConversationResponse | null => {
        const activeId = store.activeConversationId();
        return activeId ? store.conversations().find((c) => c.id === activeId) ?? null : null;
      };

      const clearActiveConversation = (): void => {
        if (messageSub) {
          messageSub.unsubscribe();
          messageSub = null;
        }
        if (conversationSub) {
          conversationSub.unsubscribe();
          conversationSub = null;
        }

        patchState(
          store,
          setAllEntities([] as CustomerChatMessage[], MESSAGE_ENTITY_CONFIG),
          setAllEntities([] as CustomerChatSharedItem[], SHARED_ITEM_ENTITY_CONFIG),
          {
            session: null,
            activeConversationId: null,
            loading: false,
            sending: false,
            aiResponding: false,
            searchResults: [],
            highlightedMessageId: null,
          }
        );
      };

      const removeConversationFromCurrentList = (conversationId: string): void => {
        const remaining = store.conversations().filter((c) => c.id !== conversationId);
        patchState(store, { conversations: sortConversations(remaining) });

        if (store.activeConversationId() !== conversationId) {
          patchState(store, { loading: false });
          return;
        }

        if (remaining.length > 0) {
          switchConversation(remaining[0].id);
          return;
        }

        clearActiveConversation();
      };

      const switchConversation = rxMethod<string>(
        pipe(
          tap((id) => {
            patchState(store, {
              activeConversationId: id,
              loading: true,
              aiResponding: false,
              errorMessage: null,
            });

            if (messageSub) {
              messageSub.unsubscribe();
              messageSub = null;
            }
            if (conversationSub) {
              conversationSub.unsubscribe();
              conversationSub = null;
            }
          }),
          switchMap((id) =>
            forkJoin({
              messages: customerChatService.getMessages(id, 0, 100),
            }).pipe(
              tap({
                next: ({ messages }) => {
                  const conv = store.conversations().find((c) => c.id === id);
                  if (conv) {
                    const session = mapToCustomerChatSession(
                      conv,
                      messages.content,
                      authStorageService.getSession()?.accountId || null
                    );
                    patchState(
                      store,
                      setAllEntities(session.messages, MESSAGE_ENTITY_CONFIG),
                      setAllEntities(session.sharedItems, SHARED_ITEM_ENTITY_CONFIG),
                      {
                        session,
                        loading: false,
                        aiResponding: false,
                        errorMessage: null,
                      }
                    );

                    websocketService.connect();
                    loadCustomerTicketStatus();
                    ticketStatusSub?.unsubscribe();
                    ticketStatusSub = websocketService.subscribe('/topic/customer.tickets').subscribe(() => loadCustomerTicketStatus());

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
                            const newStreamMsg: CustomerChatMessage = {
                              id: 'ai-streaming',
                              sender: 'AI',
                              senderName: 'ZenTech AI',
                              messageType: ChatMessageType.TEXT,
                              body: msg.content || '',
                              sentAtLabel: formatTime(msg.createdAt || new Date().toISOString()),
                              attachments: [],
                            };
                            patchState(store, addEntity(newStreamMsg, MESSAGE_ENTITY_CONFIG), {
                              aiResponding: true,
                            });
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
                          const currentConversation = getActiveConversation() ?? conv;
                          const participants = currentConversation.participants || [];
                          const senderPart = participants.find(
                            (p) => p.referenceId === msg.senderReferenceId
                          );
                          let senderName = senderPart?.displayName || 'Người dùng';
                          let sender: CustomerChatMessageSender = 'CUSTOMER';

                          if (msg.senderType === ParticipantType.BOT) {
                            sender = 'AI';
                            senderName = 'ZenTech AI';
                          } else if (msg.senderType === ParticipantType.CUSTOMER) {
                            sender = 'CUSTOMER';
                            const currentAccountId =
                              authStorageService.getSession()?.accountId || null;
                            senderName = msg.senderReferenceId === currentAccountId ? 'Bạn' : senderName;
                          } else {
                            sender = 'STAFF';
                          }

                          const mappedMsg: CustomerChatMessage = {
                            id: msg.id,
                            sender,
                            senderName,
                            messageType: msg.messageType as unknown as ChatMessageType,
                            body: msg.content || '',
                            sentAtLabel: formatTime(msg.createdAt),
                            attachments: (msg.attachments || []).map((att) => ({
                              id: att.id,
                              type: att.attachmentType as unknown as CustomerChatSharedItemType,
                              title: att.fileName,
                              url: att.mediaUrl || '',
                              thumbnailUrl:
                                att.attachmentType === ChatAttachmentType.IMAGE
                                  ? att.mediaUrl || null
                                  : null,
                            })),
                            recommendedProducts: msg.recommendedProducts || [],
                          };

                          patchState(store, addEntity(mappedMsg, MESSAGE_ENTITY_CONFIG), {
                            sending: false,
                            aiResponding:
                              msg.senderType === ParticipantType.BOT ||
                              store.session()?.status !==
                                ('BOT_CONSULTING' as unknown as CustomerChatSessionStatus)
                                ? false
                                : store.aiResponding(),
                            lastActivityLabel: mappedMsg.sentAtLabel,
                          });

                          if (msg.attachments && msg.attachments.length > 0) {
                            const newSharedItems = msg.attachments.map((att) => ({
                              id: att.id,
                              type: att.attachmentType as unknown as CustomerChatSharedItemType,
                              title: att.fileName,
                              subtitle: `${formatBytes(att.fileSize)} - ${formatTime(msg.createdAt)}`,
                              url: att.mediaUrl || '',
                              thumbnailUrl:
                                att.attachmentType === ChatAttachmentType.IMAGE
                                  ? att.mediaUrl || null
                                  : null,
                            }));
                            patchState(store, addEntities(newSharedItems, SHARED_ITEM_ENTITY_CONFIG));
                          }
                        }
                      });

                    conversationSub = websocketService
                      .subscribe<ConversationResponse | ChatConversationEventResponse>(`/topic/conversations.${id}`)
                      .subscribe((payload) => {
                        if ('eventType' in payload) return;
                        const updatedConv = payload;
                        // Check if this is a conversation status update, not a chat message response
                        if (!updatedConv || (updatedConv as any).messageType) {
                          return;
                        }

                        const currentSession = store.session();
                        const updatedList = store
                          .conversations()
                          .map((c) => (c.id === updatedConv.id ? updatedConv : c));
                        patchState(store, { conversations: sortConversations(updatedList) });

                        if (currentSession && currentSession.id === updatedConv.id) {
                          const newSession = mapToCustomerChatSession(
                            updatedConv,
                            messages.content,
                            authStorageService.getSession()?.accountId || null
                          );
                          newSession.messages = store.messages();
                          patchState(store, {
                            session: newSession,
                            aiResponding:
                              updatedConv.status === ConversationStatus.BOT_CONSULTING
                                ? store.aiResponding()
                                : false,
                          });
                        }
                      });
                  }
                },
                error: () => {
                  patchState(store, {
                    loading: false,
                    aiResponding: false,
                    errorMessage: 'Không thể tải cuộc trò chuyện.',
                  });
                },
              }),
              catchError(() => EMPTY)
            )
          )
        )
      );

      const createNewConversation = rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true, errorMessage: null, conversationArchiveFilter: 'ACTIVE' })),
          switchMap(() =>
            customerChatService.createNewConversation().pipe(
              switchMap((newConv) =>
                customerChatService.getMyConversations(0, 100, false).pipe(
                  tap({
                    next: (pageResponse) => {
                      const list = pageResponse.content || [];
                      patchState(store, { conversations: sortConversations(list) });
                      switchConversation(newConv.id);
                    },
                    error: () => {
                      patchState(store, {
                        loading: false,
                        errorMessage: 'Không thể tải danh sách hội thoại.',
                      });
                    }
                  })
                )
              ),
              catchError(() => {
                patchState(store, {
                  loading: false,
                  errorMessage: 'Không thể tạo cuộc trò chuyện mới.',
                });
                return EMPTY;
              })
            )
          )
        )
      );


      const loadCustomerTicketStatus = rxMethod<void>(
        pipe(
          switchMap(() => customerChatService.getTicketStatus().pipe(
            tap({
              next: (status) => patchState(store, { customerTicketStatus: status }),
              error: () => patchState(store, { customerTicketStatus: null }),
            }),
            catchError(() => EMPTY)
          ))
        )
      );
      const loadSession = rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true, errorMessage: null })),
          switchMap(() => {
            const session = authStorageService.getSession();
            if (!session || !authStorageService.isAuthenticated()) {
              patchState(store, {
                session: null,
                loading: false,
                aiResponding: false,
                requiresLogin: false,
                errorMessage: null,
              });
              return EMPTY;
            }

            if (isStaffSession()) {
              patchState(store, { loading: false, requiresLogin: false });
              return EMPTY;
            }

            const archived = store.conversationArchiveFilter() === 'ARCHIVED';

            return customerChatService.getMyConversations(0, 100, archived).pipe(
              switchMap((pageResponse) => {
                const list = pageResponse.content || [];
                patchState(store, { conversations: sortConversations(list) });

                const accountId = authStorageService.getSession()?.accountId;
                if (accountId) {
                  websocketService.connect();
                  customerQueueSub?.unsubscribe();
                  customerQueueSub = websocketService
                    .subscribe<ConversationResponse | ChatConversationEventResponse>(`/topic/customer.chat.${accountId}`)
                    .subscribe(payload => {
                      if ('eventType' in payload) {
                        if (payload.eventType === 'DELETED') {
                          removeConversationFromCurrentList(payload.conversationId);
                          patchState(store, { lifecycleNotice: 'Cuộc hội thoại đã bị xóa.' });
                          return;
                        }
                        if (!payload.conversation) return;
                        const existing = store.conversations().find(c => c.id === payload.conversationId);
                        patchState(store, {
                          conversations: sortConversations(store.conversations().map(c =>
                            c.id === payload.conversationId
                              ? { ...payload.conversation!, unreadCount: existing?.unreadCount ?? payload.conversation!.unreadCount }
                              : c
                          )),
                        });
                        return;
                      }

                      const existing = store.conversations().find(c => c.id === payload.id);
                      const updated: ConversationResponse = {
                        ...payload,
                        unreadCount: store.activeConversationId() === payload.id
                          ? existing?.unreadCount ?? 0
                          : (existing?.unreadCount ?? 0) + 1,
                      };
                      patchState(store, {
                        conversations: sortConversations(existing
                          ? store.conversations().map(c => c.id === updated.id ? updated : c)
                          : [...store.conversations(), updated]),
                      });
                    });
                }

                if (list.length === 0) {
                  if (!archived) {
                    createNewConversation();
                  } else {
                    clearActiveConversation();
                  }
                  return EMPTY;
                }

                switchConversation(list[0].id);
                return EMPTY;
              }),
              catchError(() => {
                patchState(store, {
                  loading: false,
                  aiResponding: false,
                  errorMessage: 'Không thể tải danh sách cuộc hội thoại.',
                });
                return EMPTY;
              })
            );
          })
        )
      );

      const sendMessage = rxMethod<string>(
        pipe(
          map((body) => body.trim()),
          switchMap((body) => {
            const conversationId = store.activeConversationId();
            if (!conversationId) {
              return EMPTY;
            }

            const pendingUploads = store.uploadEntities().filter(
              (upload) =>
                upload.conversationId === conversationId &&
                (upload.status === 'PENDING' || upload.status === 'FAILED')
            );

            if (!body && pendingUploads.length === 0) {
              return EMPTY;
            }

            if (pendingUploads.length === 0) {
              const messageRequest = withPageContext({
                messageType: ChatMessageType.TEXT,
                content: body,
                attachments: [],
              });
              patchState(store, {
                aiResponding: store.session()?.status === 'BOT_CONSULTING',
                errorMessage: null,
              });
              publishChatMessage(conversationId, messageRequest);
              return of(null);
            }

            const uploadIds = pendingUploads.map((upload) => upload.id);
            patchState(
              store,
              updateEntities(
                {
                  predicate: (upload) => uploadIds.includes(upload.id),
                  changes: { progress: 35, status: 'UPLOADING' },
                },
                UPLOAD_ENTITY_CONFIG
              ),
              { sending: true, errorMessage: null }
            );

            const uploadRequests = pendingUploads.map((upload) =>
              customerChatService.uploadFile(upload.file).pipe(
                map((result) => ({
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
                next: (results) => {
                  const attachments = results.map((result) => result.attachment);
                  const firstAttachmentType = attachments[0]?.attachmentType ?? null;
                  const content =
                    body || attachments.map((attachment) => attachment.fileName).join(', ');
                  const messageRequest = withPageContext({
                    messageType: mapMessageType(firstAttachmentType, attachments.length),
                    content,
                    attachments,
                  });

                  patchState(store, {
                    aiResponding: store.session()?.status === 'BOT_CONSULTING',
                  });
                  publishChatMessage(conversationId, messageRequest);
                  patchState(
                    store,
                    removeEntities(uploadIds, UPLOAD_ENTITY_CONFIG),
                    { sending: false, errorMessage: null }
                  );
                },
                error: () => {
                  patchState(
                    store,
                    updateEntities(
                      {
                        predicate: (upload) => uploadIds.includes(upload.id),
                        changes: { status: 'FAILED', progress: 100 },
                      },
                      UPLOAD_ENTITY_CONFIG
                    ),
                    {
                      sending: false,
                      aiResponding: false,
                      errorMessage: 'Không thể tải tệp lên. Vui lòng thử lại.',
                    }
                  );
                },
              }),
              catchError(() => EMPTY)
            );
          })
        )
      );

      const selectFiles = rxMethod<File[]>(
        pipe(
          filter((files) => files.length > 0),
          tap((files) => {
            const conversationId = store.activeConversationId();
            if (!conversationId) {
              return;
            }

            const uploads: CustomerChatUpload[] = files.map((file) => ({
              id: `upload-${conversationId}-${Date.now()}-${file.name}`,
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

      const requestAgent = rxMethod<void>(
        pipe(
          switchMap(() => {
            const id = store.activeConversationId();
            if (!id) return EMPTY;
            return customerChatService.requestAgent(id).pipe(
              tap((updatedConv) => {
                const updatedList = store
                  .conversations()
                  .map((c) => (c.id === updatedConv.id ? updatedConv : c));
                patchState(store, { conversations: sortConversations(updatedList) });

                const currentSession = store.session();
                if (currentSession && currentSession.id === updatedConv.id) {
                  const newSession = {
                    ...currentSession,
                    status: updatedConv.status as unknown as CustomerChatSessionStatus,
                  };
                  patchState(store, {
                    session: newSession,
                    aiResponding:
                      updatedConv.status === ConversationStatus.BOT_CONSULTING
                        ? store.aiResponding()
                        : false,
                  });
                }
              })
            );
          })
        )
      );

      const closeConversation = rxMethod<void>(
        pipe(
          switchMap(() => {
            const id = store.activeConversationId();
            if (!id) return EMPTY;
            return customerChatService.closeConversation(id).pipe(
              tap((updatedConv) => {
                const updatedList = store
                  .conversations()
                  .map((c) => (c.id === updatedConv.id ? updatedConv : c));
                patchState(store, { conversations: sortConversations(updatedList) });

                const currentSession = store.session();
                if (currentSession && currentSession.id === updatedConv.id) {
                  const newSession = {
                    ...currentSession,
                    status: updatedConv.status as unknown as CustomerChatSessionStatus,
                  };
                  patchState(store, { session: newSession, aiResponding: false });
                }
              })
            );
          })
        )
      );

      const reopenConversation = rxMethod<void>(
        pipe(
          switchMap(() => {
            const id = store.activeConversationId();
            if (!id) return EMPTY;
            return customerChatService.reopenConversation(id).pipe(
              tap((updatedConv) => {
                const updatedList = store
                  .conversations()
                  .map((c) => (c.id === updatedConv.id ? updatedConv : c));
                patchState(store, { conversations: sortConversations(updatedList) });

                const currentSession = store.session();
                if (currentSession && currentSession.id === updatedConv.id) {
                  const newSession = {
                    ...currentSession,
                    status: updatedConv.status as unknown as CustomerChatSessionStatus,
                  };
                  patchState(store, { session: newSession, aiResponding: false });
                }
              })
            );
          })
        )
      );

      const archiveConversation = rxMethod<string | void>(
        pipe(
          switchMap((conversationId) => {
            const id = conversationId || store.activeConversationId();
            if (!id) return EMPTY;
            patchState(store, { loading: true, errorMessage: null });

            return customerChatService.archiveConversation(id).pipe(
              tap({
                next: () => removeConversationFromCurrentList(id),
                error: () => patchState(store, {
                  loading: false,
                  errorMessage: 'Không thể lưu trữ cuộc trò chuyện.',
                }),
              }),
              catchError(() => EMPTY)
            );
          })
        )
      );

      const unarchiveConversation = rxMethod<string | void>(
        pipe(
          switchMap((conversationId) => {
            const id = conversationId || store.activeConversationId();
            if (!id) return EMPTY;
            patchState(store, { loading: true, errorMessage: null });

            return customerChatService.unarchiveConversation(id).pipe(
              tap({
                next: () => removeConversationFromCurrentList(id),
                error: () => patchState(store, {
                  loading: false,
                  errorMessage: 'Không thể khôi phục cuộc trò chuyện.',
                }),
              }),
              catchError(() => EMPTY)
            );
          })
        )
      );

      const deleteConversation = rxMethod<string | void>(
        pipe(
          switchMap((conversationId) => {
            const id = conversationId || store.activeConversationId();
            if (!id) return EMPTY;
            patchState(store, { loading: true, errorMessage: null });

            return customerChatService.deleteConversation(id).pipe(
              tap({
                next: () => removeConversationFromCurrentList(id),
                error: () => patchState(store, {
                  loading: false,
                  errorMessage: 'Không thể xóa cuộc trò chuyện.',
                }),
              }),
              catchError(() => EMPTY)
            );
          })
        )
      );

      const searchMessages = rxMethod<string>(
        pipe(
          tap((keyword) => {
            patchState(store, { searchKeyword: keyword });
            if (!keyword.trim()) {
              patchState(store, { searchResults: [] });
              return;
            }
            handleEvent({ type: CustomerChatEventType.SearchMessagesStarted });
          }),
          filter((keyword) => !!keyword.trim()),
          switchMap((keyword) => {
            const conversationId = store.activeConversationId();
            if (!conversationId) return EMPTY;

            return customerChatService.searchMessages(conversationId, keyword, 0, 50).pipe(
              tap({
                next: (results) => {
                  handleEvent({
                    type: CustomerChatEventType.SearchMessagesSucceeded,
                    results: results.content || [],
                  });
                },
                error: () => {
                  handleEvent({ type: CustomerChatEventType.SearchMessagesFailed });
                },
              }),
              catchError(() => EMPTY)
            );
          })
        )
      );

      const jumpToMessage = rxMethod<string>(
        pipe(
          tap(() => patchState(store, { loading: true })),
          switchMap((messageId) => {
            const conversationId = store.activeConversationId();
            if (!conversationId) return EMPTY;

            // Check if message is already in store
            const exists = store.messages().some((m) => m.id === messageId);
            if (exists) {
              patchState(store, { loading: false, highlightedMessageId: messageId });
              // Logic to trigger scroll can be done in UI component by observing a signal or using a service
              return of(messageId);
            }

            // Fetch context messages
            return customerChatService.getMessageContext(conversationId, messageId).pipe(
              tap({
                next: (messages) => {
                  const conv = store.conversations().find((c) => c.id === conversationId);
                  if (conv) {
                    const session = mapToCustomerChatSession(
                      conv,
                      messages,
                      authStorageService.getSession()?.accountId || null
                    );
                    patchState(
                      store,
                      setAllEntities(session.messages, MESSAGE_ENTITY_CONFIG),
                      setAllEntities(session.sharedItems, SHARED_ITEM_ENTITY_CONFIG),
                      {
                        session,
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

      const markActiveConversationRead = rxMethod<void>(
        pipe(
          switchMap(() => {
            const conversationId = store.activeConversationId();
            if (!conversationId) return EMPTY;
            return customerChatService.markConversationRead(conversationId).pipe(
              tap(() => patchState(store, {
                conversations: store.conversations().map(conversation =>
                  conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
                ),
              })),
              catchError(() => EMPTY)
            );
          })
        )
      );

      const clearHighlightedMessage = rxMethod<void>(
        pipe(
          tap(() => patchState(store, { highlightedMessageId: null }))
        )
      );

      return {
        dispatch: handleEvent,
        loadSession,
        loadCustomerTicketStatus,
        switchConversation,
        createNewConversation,
        sendMessage,
        selectFiles,
        requestAgent,
        closeConversation,
        reopenConversation,
        archiveConversation,
        unarchiveConversation,
        deleteConversation,
        searchMessages,
        jumpToMessage,
        clearHighlightedMessage,
        markActiveConversationRead,
        clearLifecycleNotice(): void {
          patchState(store, { lifecycleNotice: null });
        },
        openPopup(): void {
          if (!hasCustomerSession()) {
            patchState(store, {
              popupOpen: true,
              sharedSidebarOpen: false,
              loading: false,
              requiresLogin: true,
              errorMessage: null,
            });
            return;
          }

          handleEvent({ type: CustomerChatEventType.PopupOpened });

          if (!store.session() && !isStaffSession()) {
            loadSession();
          }
        },
        closePopup(): void {
          handleEvent({ type: CustomerChatEventType.PopupClosed });
        },
        togglePopup(): void {
          handleEvent({
            type: CustomerChatEventType.PopupToggled,
            popupOpen: !store.popupOpen(),
          });
        },
        openFullChat(): void {
          handleEvent({ type: CustomerChatEventType.FullChatOpened });
        },
        setConversationArchiveFilter(filterValue: CustomerChatConversationArchiveFilter): void {
          if (store.conversationArchiveFilter() === filterValue) {
            return;
          }
          patchState(store, { conversationArchiveFilter: filterValue });
          loadSession();
        },
        requestSharedContent(): void {
          handleEvent({ type: CustomerChatEventType.SharedContentRequested });
        },
        requestConversationDetails(): void {
          handleEvent({ type: CustomerChatEventType.ConversationDetailsRequested });
        },
        removeUpload(uploadId: string): void {
          handleEvent({ type: CustomerChatEventType.UploadRemoved, uploadId });
        },
        setSharedContentTab(activeSharedTab: CustomerChatSharedTab): void {
          handleEvent({ type: CustomerChatEventType.SharedContentTabChanged, activeSharedTab });
        },
        toggleSharedSidebar(): void {
          handleEvent({
            type: CustomerChatEventType.SharedSidebarToggled,
            sharedSidebarOpen: !store.sharedSidebarOpen(),
          });
        },
        closeSharedSidebar(): void {
          handleEvent({ type: CustomerChatEventType.SharedSidebarClosed });
        },
        setPageContext(pageContext: CustomerChatPageContext | null): void {
          patchState(store, { pageContext });
        },
        dismissTicketStatus(ticketCode: string, status: string): void {
          patchState(store, { dismissedTicketCode: ticketCode, dismissedTicketStatus: status });
          if (ticketCode && typeof localStorage !== 'undefined' && localStorage) {
            localStorage.setItem('dismissed_ticket_code', ticketCode);
            localStorage.setItem('dismissed_ticket_status', status);
          }
        },
      };
    }
  ),
  withHooks((store) => {
    const ws = inject(CustomerChatWebsocketService);
    const authSessionStore = inject(AuthSessionStore);
    
    return {
      onInit() {
        const storage = typeof localStorage !== 'undefined' ? localStorage : null;
        const code = storage?.getItem('dismissed_ticket_code') ?? null;
        const status = storage?.getItem('dismissed_ticket_status') ?? null;
        patchState(store, { dismissedTicketCode: code, dismissedTicketStatus: status });

        effect(() => {
          if (!authSessionStore.isAuthenticated()) {
            patchState(
              store,
              setAllEntities([] as CustomerChatMessage[], MESSAGE_ENTITY_CONFIG),
              setAllEntities([] as CustomerChatSharedItem[], SHARED_ITEM_ENTITY_CONFIG),
              setAllEntities([] as CustomerChatUpload[], UPLOAD_ENTITY_CONFIG),
              INITIAL_STATE
            );
          }
        }, { allowSignalWrites: true });
      },
      onDestroy() {
        ws.disconnect();
      },
    };
  })
);


