import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import {
  addEntities,
  addEntity,
  removeEntities,
  removeEntity,
  setAllEntities,
  updateEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, Subscription, catchError, filter, forkJoin, map, of, pipe, switchMap, tap } from 'rxjs';
import { AuthStorageService } from '../../../../core/services/auth-storage.service';
import { CustomerChatEvent, CustomerChatEventType } from '../models/customer-chat.event';
import {
  ChatAttachmentType,
  ChatMessageResponse,
  ChatMessageType,
  ConversationResponse,
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
  ParticipantStatus,
  ParticipantType,
  formatBytes,
  formatTime,
  mapToCustomerChatSession,
} from '../models/customer-chat.models';
import { CustomerChatService } from '../services/customer-chat.service';
import { CustomerChatWebsocketService } from '../services/customer-chat-websocket.service';

interface CustomerChatUiState {
  session: CustomerChatSession | null;
  conversations: ConversationResponse[];
  activeConversationId: string | null;
  activeSharedTab: CustomerChatSharedTab;
  fullSidebarMode: CustomerChatFullSidebarMode;
  popupOpen: boolean;
  sharedSidebarOpen: boolean;
  requiresLogin: boolean;
  loading: boolean;
  sending: boolean;
  errorMessage: string | null;
  lastActivityLabel: string;
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
  popupOpen: false,
  sharedSidebarOpen: false,
  requiresLogin: false,
  loading: false,
  sending: false,
  errorMessage: null,
  lastActivityLabel: '',
};

export const CustomerChatStore = signalStore(
  { providedIn: 'root' },
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
      activeConversationId,
      activeSharedTab,
    }) => ({
      messages: computed(() => messageEntities()),
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
      authStorageService = inject(AuthStorageService)
    ) => {
      let messageSub: Subscription | null = null;
      let conversationSub: Subscription | null = null;

      const isStaffSession = (): boolean => {
        const session = authStorageService.getSession();

        return (
          session?.roles.some((role) =>
            ['OWNER', 'MANAGER', 'EMPLOYEE', 'ADMIN'].includes(role)
          ) ?? false
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
                requiresLogin: false,
                errorMessage: null,
              }
            );
            break;

          case CustomerChatEventType.SessionLoadFailed:
            patchState(store, {
              loading: false,
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

      const switchConversation = rxMethod<string>(
        pipe(
          tap((id) => {
            patchState(store, { activeConversationId: id, loading: true, errorMessage: null });

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
                        errorMessage: null,
                      }
                    );

                    websocketService.connect();

                    messageSub = websocketService
                      .subscribe<ChatMessageResponse>(`/topic/conversations.${id}`)
                      .subscribe((msg) => {
                        const exists = store.messages().some((existing) => existing.id === msg.id);
                        if (!exists) {
                          const participants = conv.participants || [];
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
                          };

                          patchState(store, addEntity(mappedMsg, MESSAGE_ENTITY_CONFIG), {
                            sending: false,
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
                      .subscribe<ConversationResponse>(`/topic/conversations.${id}`)
                      .subscribe((updatedConv) => {
                        const updatedList = store
                          .conversations()
                          .map((c) => (c.id === updatedConv.id ? updatedConv : c));
                        patchState(store, { conversations: updatedList });

                        const currentSession = store.session();
                        if (currentSession && currentSession.id === updatedConv.id) {
                          const newSession = mapToCustomerChatSession(
                            updatedConv,
                            messages.content,
                            authStorageService.getSession()?.accountId || null
                          );
                          newSession.messages = store.messages();
                          patchState(store, { session: newSession });
                        }
                      });
                  }
                },
                error: () => {
                  patchState(store, {
                    loading: false,
                    errorMessage: 'Không thể tải cuộc trò chuyện.',
                  });
                },
              }),
              catchError(() => EMPTY)
            )
          )
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
                requiresLogin: false,
                errorMessage: null,
              });
              return EMPTY;
            }

            if (isStaffSession()) {
              patchState(store, { loading: false, requiresLogin: false });
              return EMPTY;
            }

            return customerChatService.getMyConversations(0, 100).pipe(
              switchMap((pageResponse) => {
                const list = pageResponse.content || [];
                patchState(store, { conversations: list });

                if (list.length > 0) {
                  const activeConv =
                    list.find((c) => c.status !== ConversationStatus.CLOSED) || list[0];
                  switchConversation(activeConv.id);
                  return EMPTY;
                } else {
                  return customerChatService.createOrGetConversation().pipe(
                    tap((newConv) => {
                      patchState(store, { conversations: [newConv] });
                      switchConversation(newConv.id);
                    })
                  );
                }
              }),
              catchError(() => {
                patchState(store, {
                  loading: false,
                  errorMessage: 'Không thể tải danh sách cuộc hội thoại.',
                });
                return EMPTY;
              })
            );
          })
        )
      );

      const createNewConversation = rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true, errorMessage: null })),
          switchMap(() =>
            customerChatService.createNewConversation().pipe(
              tap({
                next: (newConv) => {
                  const currentList = store.conversations();
                  patchState(store, { conversations: [newConv, ...currentList] });
                  switchConversation(newConv.id);
                },
                error: () => {
                  patchState(store, {
                    loading: false,
                    errorMessage: 'Không thể tạo cuộc trò chuyện mới.',
                  });
                },
              }),
              catchError(() => EMPTY)
            )
          )
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
              const messageRequest = {
                messageType: ChatMessageType.TEXT,
                content: body,
                attachments: [],
              };
              websocketService.publish(`/app/chat/${conversationId}/send`, messageRequest);
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
                  const messageRequest = {
                    messageType: mapMessageType(firstAttachmentType, attachments.length),
                    content,
                    attachments,
                  };

                  websocketService.publish(`/app/chat/${conversationId}/send`, messageRequest);
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
                      errorMessage: 'KhÃ´ng thá»ƒ táº£i tá»‡p lÃªn. Vui lÃ²ng thá»­ láº¡i.',
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
                patchState(store, { conversations: updatedList });

                const currentSession = store.session();
                if (currentSession && currentSession.id === updatedConv.id) {
                  const newSession = {
                    ...currentSession,
                    status: updatedConv.status as unknown as CustomerChatSessionStatus,
                  };
                  patchState(store, { session: newSession });
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
                patchState(store, { conversations: updatedList });

                const currentSession = store.session();
                if (currentSession && currentSession.id === updatedConv.id) {
                  const newSession = {
                    ...currentSession,
                    status: updatedConv.status as unknown as CustomerChatSessionStatus,
                  };
                  patchState(store, { session: newSession });
                }
              })
            );
          })
        )
      );

      return {
        dispatch: handleEvent,
        loadSession,
        switchConversation,
        createNewConversation,
        sendMessage,
        selectFiles,
        requestAgent,
        closeConversation,
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
      };
    }
  ),
  withHooks((store) => {
    const ws = inject(CustomerChatWebsocketService);
    return {
      onDestroy() {
        ws.disconnect();
      },
    };
  })
);
