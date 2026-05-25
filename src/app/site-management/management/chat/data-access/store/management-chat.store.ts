import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  removeAllEntities,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import { ManagementChatEvent, ManagementChatEventType } from '../models/management-chat.event';
import {
  ManagementChatConversation,
  ManagementChatConversationStatus,
  ManagementChatExpertRequestFilter,
  ManagementChatExpertRequestStatus,
  ManagementChatMediaItem,
  ManagementChatMediaTab,
  ManagementChatMessage,
  ManagementChatStatusFilter,
} from '../models/management-chat.models';
import { ManagementChatService } from '../services/management-chat.service';

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
  AI_ASSISTING: 'AI dang tu van',
  WAITING_STAFF: 'Dang cho nhan vien',
  STAFF_HANDLING: 'Nhan vien dang xu ly',
  CLOSED: 'Da dong',
};

const EXPERT_REQUEST_LABELS: Record<ManagementChatExpertRequestStatus, string> = {
  WAITING: 'Dang cho phan hoi',
  ACCEPTED: 'Da chap nhan',
  DECLINED: 'Da tu choi',
  CANCELLED: 'Da bi huy',
};

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
  withMethods((store, managementChatService = inject(ManagementChatService)) => {
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
            errorMessage: 'Khong the tai khong gian tu van khach hang.',
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

    const loadWorkspace = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: ManagementChatEventType.WorkspaceLoadStarted })),
        switchMap(() =>
          managementChatService.getWorkspace().pipe(
            tap({
              next: workspace =>
                handleEvent({ type: ManagementChatEventType.WorkspaceLoadSucceeded, workspace }),
              error: () => handleEvent({ type: ManagementChatEventType.WorkspaceLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    return {
      dispatch: handleEvent,
      loadWorkspace,
      selectConversation(conversationId: string): void {
        handleEvent({ type: ManagementChatEventType.ConversationSelected, conversationId });
      },
      clearSelection(): void {
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
      acceptConversation(): void {
        const conversationId = store.selectedConversationId();

        if (!conversationId) {
          return;
        }

        handleEvent({ type: ManagementChatEventType.ConversationAccepted, conversationId });
      },
      closeConversation(): void {
        const conversationId = store.selectedConversationId();

        if (!conversationId) {
          return;
        }

        handleEvent({ type: ManagementChatEventType.ConversationClosed, conversationId });
      },
      sendStaffMessage(body: string): void {
        const conversation = store.selectedConversation();
        const trimmedBody = body.trim();

        if (!conversation || !trimmedBody) {
          return;
        }

        handleEvent({
          type: ManagementChatEventType.StaffMessageSubmitted,
          conversation,
          message: {
            id: `msg-staff-${Date.now()}`,
            conversationId: conversation.id,
            sender: 'STAFF',
            senderName: 'Ban (Nhan vien)',
            body: trimmedBody,
            sentAtLabel: 'Vua xong',
          },
        });
      },
    };
  })
);

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
