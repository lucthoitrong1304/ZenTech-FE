import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import {
  OwnerChatConversation,
  OwnerChatConversationStatus,
  OwnerChatExpertRequestFilter,
  OwnerChatExpertRequestStatus,
  OwnerChatMediaItem,
  OwnerChatMediaTab,
  OwnerChatMessage,
  OwnerChatStatusFilter,
} from '../models/owner-chat.models';
import { OwnerChatService } from '../services/owner-chat.service';

interface OwnerChatState {
  conversations: OwnerChatConversation[];
  selectedConversationId: string | null;
  messages: OwnerChatMessage[];
  mediaItems: OwnerChatMediaItem[];
  statusFilter: OwnerChatStatusFilter;
  expertRequestFilter: OwnerChatExpertRequestFilter;
  searchKeyword: string;
  activeMediaTab: OwnerChatMediaTab;
  mediaDrawerOpen: boolean;
  loading: boolean;
  errorMessage: string | null;
}

const INITIAL_STATE: OwnerChatState = {
  conversations: [],
  selectedConversationId: null,
  messages: [],
  mediaItems: [],
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

export const OwnerChatStore = signalStore(
  withState<OwnerChatState>(INITIAL_STATE),
  withComputed(
    ({
      conversations,
      selectedConversationId,
      messages,
      mediaItems,
      statusFilter,
      expertRequestFilter,
      searchKeyword,
      activeMediaTab,
    }) => ({
      filteredConversations: computed(() => {
        const normalizedKeyword = normalize(searchKeyword());

        return conversations().filter(conversation => {
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
          conversations().find(conversation => conversation.id === selectedConversationId()) ?? null
      ),
      selectedMessages: computed(() =>
        messages().filter(message => message.conversationId === selectedConversationId())
      ),
      selectedMedia: computed(() => {
        const currentConversationId = selectedConversationId();

        return mediaItems().filter(mediaItem => {
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
          count: conversations().filter(conversation => conversation.status === status).length,
        }))
      ),
      expertRequestCounts: computed(() =>
        (Object.keys(EXPERT_REQUEST_LABELS) as OwnerChatExpertRequestStatus[]).map(status => ({
          status,
          label: EXPERT_REQUEST_LABELS[status],
          count: conversations().filter(
            conversation => conversation.expertRequestStatus === status
          ).length,
        }))
      ),
      hasSelection: computed(() => selectedConversationId() !== null),
    })
  ),
  withMethods((store, ownerChatService = inject(OwnerChatService)) => {
    const loadWorkspace = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, errorMessage: null })),
        switchMap(() =>
          ownerChatService.getWorkspace().pipe(
            tap({
              next: workspace =>
                patchState(store, {
                  conversations: workspace.conversations,
                  messages: workspace.messages,
                  mediaItems: workspace.mediaItems,
                  selectedConversationId: null,
                  loading: false,
                  errorMessage: null,
                }),
              error: () =>
                patchState(store, {
                  loading: false,
                  errorMessage: 'Không thể tải không gian tư vấn khách hàng.',
                }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    return {
      loadWorkspace,
      selectConversation(conversationId: string): void {
        patchState(store, {
          selectedConversationId: conversationId,
          mediaDrawerOpen: false,
          conversations: store.conversations().map(conversation =>
            conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
          ),
        });
      },
      clearSelection(): void {
        patchState(store, {
          selectedConversationId: null,
          mediaDrawerOpen: false,
          activeMediaTab: 'ALL',
        });
      },
      setSearchKeyword(searchKeyword: string): void {
        patchState(store, { searchKeyword });
      },
      setStatusFilter(statusFilter: OwnerChatStatusFilter): void {
        patchState(store, { statusFilter });
      },
      setExpertRequestFilter(expertRequestFilter: OwnerChatExpertRequestFilter): void {
        patchState(store, { expertRequestFilter });
      },
      toggleMediaDrawer(): void {
        patchState(store, { mediaDrawerOpen: !store.mediaDrawerOpen() });
      },
      openMediaDrawer(): void {
        patchState(store, { mediaDrawerOpen: true });
      },
      closeMediaDrawer(): void {
        patchState(store, { mediaDrawerOpen: false });
      },
      setMediaTab(activeMediaTab: OwnerChatMediaTab): void {
        patchState(store, { activeMediaTab });
      },
      acceptConversation(): void {
        const selectedConversationId = store.selectedConversationId();

        if (!selectedConversationId) {
          return;
        }

        patchState(store, {
          conversations: store.conversations().map(conversation =>
            conversation.id === selectedConversationId
              ? { ...conversation, status: 'STAFF_HANDLING', expertRequestStatus: 'ACCEPTED' }
              : conversation
          ),
        });
      },
      closeConversation(): void {
        const selectedConversationId = store.selectedConversationId();

        if (!selectedConversationId) {
          return;
        }

        patchState(store, {
          conversations: store.conversations().map(conversation =>
            conversation.id === selectedConversationId
              ? { ...conversation, status: 'CLOSED', unreadCount: 0 }
              : conversation
          ),
          mediaDrawerOpen: false,
        });
      },
      sendStaffMessage(body: string): void {
        const selectedConversationId = store.selectedConversationId();
        const trimmedBody = body.trim();

        if (!selectedConversationId || !trimmedBody) {
          return;
        }

        const message: OwnerChatMessage = {
          id: `msg-staff-${Date.now()}`,
          conversationId: selectedConversationId,
          sender: 'STAFF',
          senderName: 'Bạn (Nhân viên)',
          body: trimmedBody,
          sentAtLabel: 'Vua xong',
        };

        patchState(store, {
          messages: [...store.messages(), message],
          conversations: store.conversations().map(conversation =>
            conversation.id === selectedConversationId
              ? {
                  ...conversation,
                  lastMessagePreview: trimmedBody,
                  lastMessageAtLabel: 'Vua xong',
                  status:
                    conversation.status === 'CLOSED' ? conversation.status : 'STAFF_HANDLING',
                }
              : conversation
          ),
        });
      },
    };
  })
);

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
