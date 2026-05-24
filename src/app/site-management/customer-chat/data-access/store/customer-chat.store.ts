import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntities,
  addEntity,
  removeEntity,
  setAllEntities,
  updateEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, filter, map, pipe, switchMap, tap } from 'rxjs';
import { CustomerChatEvent, CustomerChatEventType } from '../models/customer-chat.event';
import {
  CustomerChatFullSidebarMode,
  CustomerChatMessage,
  CustomerChatSession,
  CustomerChatSharedItem,
  CustomerChatSharedTab,
  CustomerChatUpload,
  CustomerChatUploadResult,
} from '../models/customer-chat.models';
import { CustomerChatService } from '../services/customer-chat.service';

interface CustomerChatUiState {
  session: CustomerChatSession | null;
  activeSharedTab: CustomerChatSharedTab;
  fullSidebarMode: CustomerChatFullSidebarMode;
  popupOpen: boolean;
  sharedSidebarOpen: boolean;
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
  activeSharedTab: 'MEDIA',
  fullSidebarMode: 'DETAILS',
  popupOpen: false,
  sharedSidebarOpen: false,
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
    ({ session, messageEntities, sharedItemEntities, uploadEntities, activeSharedTab }) => ({
    messages: computed(() => messageEntities()),
    sharedItems: computed(() => sharedItemEntities()),
    sharedMediaItems: computed(() =>
      sharedItemEntities().filter(item => item.type === 'IMAGE' || item.type === 'VIDEO')
    ),
    sharedFileItems: computed(() => sharedItemEntities().filter(item => item.type === 'FILE')),
    sharedLinkItems: computed(() => sharedItemEntities().filter(item => item.type === 'LINK')),
    uploads: computed(() => uploadEntities()),
    customer: computed(() => session()?.customer ?? null),
    assistant: computed(() => session()?.assistant ?? null),
    staff: computed(() => session()?.staff ?? null),
    product: computed(() => session()?.product ?? null),
    staffJoined: computed(() => session()?.status === 'STAFF_JOINED' && session()?.staff !== null),
    selectedSharedItems: computed(() =>
      sharedItemEntities().filter(item => {
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
        media: items.filter(item => item.type === 'IMAGE' || item.type === 'VIDEO').length,
        files: items.filter(item => item.type === 'FILE').length,
        links: items.filter(item => item.type === 'LINK').length,
      };
    }),
    hasActiveUploads: computed(() => uploadEntities().some(upload => upload.status === 'UPLOADING')),
  })
  ),
  withMethods((store, customerChatService = inject(CustomerChatService)) => {
    const handleEvent = (event: CustomerChatEvent): void => {
      switch (event.type) {
        case CustomerChatEventType.SessionLoadStarted:
          patchState(store, { loading: true, errorMessage: null });
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
              errorMessage: null,
            }
          );
          break;

        case CustomerChatEventType.SessionLoadFailed:
          patchState(store, {
            loading: false,
            errorMessage: 'Khong the tai cuoc tro chuyen. Vui long thu lai sau.',
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
            errorMessage: 'Tin nhan chua gui duoc. Vui long thu lai.',
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
                predicate: upload => event.uploadFileNames.includes(upload.fileName),
                changes: { progress: 100, status: 'COMPLETE' },
              },
              UPLOAD_ENTITY_CONFIG
            ),
            addEntities(event.sharedItems, SHARED_ITEM_ENTITY_CONFIG),
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
                predicate: upload => upload.status === 'UPLOADING',
                changes: { status: 'FAILED', progress: 100 },
              },
              UPLOAD_ENTITY_CONFIG
            ),
            { errorMessage: 'Khong the tai tep len. Vui long thu lai.' }
          );
          break;

        case CustomerChatEventType.PopupOpened:
          patchState(store, { activeSharedTab: 'MEDIA', popupOpen: true, sharedSidebarOpen: false });
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

    const loadSession = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: CustomerChatEventType.SessionLoadStarted })),
        switchMap(() =>
          customerChatService.getSession().pipe(
            tap({
              next: session =>
                handleEvent({ type: CustomerChatEventType.SessionLoadSucceeded, session }),
              error: () => handleEvent({ type: CustomerChatEventType.SessionLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const sendMessage = rxMethod<string>(
      pipe(
        map(body => body.trim()),
        filter(Boolean),
        tap(body => {
          const message: CustomerChatMessage = {
            id: `customer-message-${Date.now()}`,
            sender: 'CUSTOMER',
            senderName: store.customer()?.name ?? 'Ban',
            body,
            sentAtLabel: 'Vua xong',
            attachments: [],
          };

          handleEvent({ type: CustomerChatEventType.CustomerMessageQueued, message });
        }),
        switchMap(body =>
          customerChatService
            .sendCustomerMessage({
              sessionId: store.session()?.id ?? '',
              body,
              staffJoined: store.staffJoined(),
            })
            .pipe(
              tap({
                next: responseBody => {
                  const responder = store.staffJoined() ? store.staff() : store.assistant();
                  const message: CustomerChatMessage = {
                    id: `chat-response-${Date.now()}`,
                    sender: store.staffJoined() ? 'STAFF' : 'AI',
                    senderName: responder?.name ?? 'ZenTech',
                    body: responseBody,
                    sentAtLabel: 'Vua xong',
                    attachments: [],
                  };

                  handleEvent({
                    type: CustomerChatEventType.CustomerMessageResponded,
                    message,
                  });
                },
                error: () => handleEvent({ type: CustomerChatEventType.CustomerMessageFailed }),
              }),
              catchError(() => EMPTY)
            )
        )
      )
    );

    const selectFiles = rxMethod<File[]>(
      pipe(
        filter(files => files.length > 0),
        tap(files => {
          const uploads: CustomerChatUpload[] = files.map(file => ({
            id: `upload-${Date.now()}-${file.name}`,
            fileName: file.name,
            sizeLabel: formatFileSize(file.size),
            progress: 38,
            status: 'UPLOADING',
          }));

          handleEvent({ type: CustomerChatEventType.UploadsQueued, uploads });
        }),
        switchMap(files =>
          customerChatService.uploadCustomerFiles(files).pipe(
            tap({
              next: results =>
                handleEvent({
                  type: CustomerChatEventType.UploadsSucceeded,
                  uploadFileNames: results.map(result => result.title),
                  sharedItems: toSharedItems(results),
                  activeSharedTab: results.some(result => result.type === 'IMAGE')
                    ? 'MEDIA'
                    : 'FILES',
                }),
              error: () => handleEvent({ type: CustomerChatEventType.UploadsFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    return {
      dispatch: handleEvent,
      loadSession,
      sendMessage,
      selectFiles,
      openPopup(): void {
        handleEvent({ type: CustomerChatEventType.PopupOpened });
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
  })
);

function toSharedItems(results: CustomerChatUploadResult[]): CustomerChatSharedItem[] {
  return results.map(result => ({
    id: result.id,
    type: result.type,
    title: result.title,
    subtitle: result.subtitle,
    url: result.url,
    thumbnailUrl: result.type === 'IMAGE' ? result.url : null,
  }));
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
