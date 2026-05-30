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
import { EMPTY, Subscription, catchError, forkJoin, of, pipe, switchMap, tap, map } from 'rxjs';
import { ManagementChatEvent, ManagementChatEventType } from '../models/management-chat.event';
import {
  ManagementChatConversation,
  ManagementChatConversationStatus,
  ManagementChatExpertRequestFilter,
  ManagementChatExpertRequestStatus,
  ManagementChatMediaItem,
  ManagementChatMediaTab,
  ManagementChatMediaType,
  ManagementChatMessage,
  ManagementChatStatusFilter,
  ManagementChatUpload,
  ManagementChatWorkspace,
} from '../models/management-chat.models';
import { ManagementChatService } from '../services/management-chat.service';
import { CustomerChatService } from '../../../../customer-chat/data-access/services/customer-chat.service';
import { CustomerChatWebsocketService } from '../../../../customer-chat/data-access/services/customer-chat-websocket.service';
import {
  ChatMessageResponse,
  ConversationResponse,
  ConversationStatus,
  ParticipantType,
  formatTime,
  ChatMessageType,
  ChatAttachmentType,
  formatBytes,
} from '../../../../customer-chat/data-access/models/customer-chat.models';

interface ManagementChatUiState {
  selectedConversationId: string | null;
  statusFilter: ManagementChatStatusFilter;
  expertRequestFilter: ManagementChatExpertRequestFilter;
  searchKeyword: string;
  activeMediaTab: ManagementChatMediaTab;
  mediaDrawerOpen: boolean;
  loading: boolean;
  errorMessage: string | null;
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
  expertRequestFilter: 'ALL',
  searchKeyword: '',
  activeMediaTab: 'ALL',
  mediaDrawerOpen: false,
  loading: false,
  errorMessage: null,
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
    callData: m.messageType === ChatMessageType.CALL && m.content ? (() => { try { return JSON.parse(m.content); } catch { return undefined; } })() : undefined,
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
      canReplyToSelectedConversation: computed(
        () =>
          conversationEntities().find(conversation => conversation.id === selectedConversationId())
            ?.status === 'STAFF_HANDLING'
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
    websocketService = inject(CustomerChatWebsocketService)
  ) => {
    let queueSub: Subscription | null = null;
    let messageSub: Subscription | null = null;
    let conversationSub: Subscription | null = null;

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
              selectedConversationId: null,
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

        case ManagementChatEventType.SelectionCleared:
          patchState(store, {
            selectedConversationId: null,
            mediaDrawerOpen: false,
            activeMediaTab: 'ALL',
          });
          break;

        case ManagementChatEventType.SearchKeywordChanged:
          patchState(store, { searchKeyword: event.searchKeyword });
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
      }
    };

    const loadConversationMessages = (conversationId: string, customerName: string) => {
      return customerChatService.getMessages(conversationId, 0, 100).pipe(
        tap((pageRes) => {
          const mappedMessages = (pageRes.content || []).map((m) =>
            mapToManagementChatMessage(m, customerName)
          );
          const mediaItems = (pageRes.content || []).flatMap((m) =>
            mapToManagementChatMediaItems(m)
          );
          patchState(
            store,
            setAllEntities(mappedMessages, MESSAGE_ENTITY_CONFIG),
            setAllEntities(mediaItems, MEDIA_ENTITY_CONFIG)
          );
        }),
        catchError(() => EMPTY)
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
                  .subscribe<ConversationResponse>('/topic/management.chat.queue')
                  .subscribe((updatedConv) => {
                    const mapped = managementChatService.mapToManagementChatConversation(updatedConv);
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
              error: () => handleEvent({ type: ManagementChatEventType.WorkspaceLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const selectConversation = rxMethod<string>(
      pipe(
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
                  const exists = store.messages().some((existing) => existing.id === msg.id);
                  if (!exists) {
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
                .subscribe<ConversationResponse>(`/topic/conversations.${id}`)
                .subscribe((updatedConv) => {
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
          if (!conversationId) return EMPTY;

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

    const sendCallMessage = rxMethod<{ duration: string; status: 'ENDED' | 'MISSED' | 'BUSY' }>(
      pipe(
        tap(({ duration, status }) => {
          const conversationId = store.selectedConversationId();
          if (!conversationId) return;

          const messageRequest = {
            messageType: ChatMessageType.CALL,
            content: JSON.stringify({ duration, status }),
            attachments: [],
          };

          websocketService.publish(`/app/chat/${conversationId}/send`, messageRequest);
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
            websocketService.publish(`/app/chat/${conversationId}/send`, messageRequest);
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
      setStatusFilter(statusFilter: ManagementChatStatusFilter): void {
        handleEvent({ type: ManagementChatEventType.StatusFilterChanged, statusFilter });
      },
      setExpertRequestFilter(expertRequestFilter: ManagementChatExpertRequestFilter): void {
        handleEvent({
          type: ManagementChatEventType.ExpertRequestFilterChanged,
          expertRequestFilter,
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
      setMediaTab(activeMediaTab: ManagementChatMediaTab): void {
        handleEvent({ type: ManagementChatEventType.MediaTabChanged, activeMediaTab });
      },
      acceptConversation,
      closeConversation,
      sendStaffMessage,
      sendCallMessage,
      selectStaffFiles,
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
