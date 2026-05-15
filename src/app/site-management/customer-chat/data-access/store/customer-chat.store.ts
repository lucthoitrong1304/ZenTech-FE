import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, filter, map, pipe, switchMap, tap } from 'rxjs';
import {
  CustomerChatMessage,
  CustomerChatSession,
  CustomerChatSharedItem,
  CustomerChatSharedTab,
  CustomerChatUpload,
} from '../models/customer-chat.models';
import { CustomerChatService } from '../services/customer-chat.service';

interface CustomerChatState {
  session: CustomerChatSession | null;
  messages: CustomerChatMessage[];
  sharedItems: CustomerChatSharedItem[];
  uploads: CustomerChatUpload[];
  activeSharedTab: CustomerChatSharedTab;
  popupOpen: boolean;
  sharedSidebarOpen: boolean;
  loading: boolean;
  sending: boolean;
  errorMessage: string | null;
  lastActivityLabel: string;
}

const INITIAL_STATE: CustomerChatState = {
  session: null,
  messages: [],
  sharedItems: [],
  uploads: [],
  activeSharedTab: 'MEDIA',
  popupOpen: false,
  sharedSidebarOpen: false,
  loading: false,
  sending: false,
  errorMessage: null,
  lastActivityLabel: '',
};

export const CustomerChatStore = signalStore(
  { providedIn: 'root' },
  withState<CustomerChatState>(INITIAL_STATE),
  withComputed(({ session, sharedItems, activeSharedTab, uploads }) => ({
    customer: computed(() => session()?.customer ?? null),
    assistant: computed(() => session()?.assistant ?? null),
    staff: computed(() => session()?.staff ?? null),
    product: computed(() => session()?.product ?? null),
    staffJoined: computed(() => session()?.status === 'STAFF_JOINED' && session()?.staff !== null),
    selectedSharedItems: computed(() =>
      sharedItems().filter(item => {
        switch (activeSharedTab()) {
          case 'MEDIA':
            return item.type === 'IMAGE' || item.type === 'VIDEO';
          case 'FILES':
            return item.type === 'FILE';
          case 'LINKS':
            return item.type === 'LINK';
        }
      })
    ),
    sharedCounts: computed(() => ({
      media: sharedItems().filter(item => item.type === 'IMAGE' || item.type === 'VIDEO').length,
      files: sharedItems().filter(item => item.type === 'FILE').length,
      links: sharedItems().filter(item => item.type === 'LINK').length,
    })),
    hasActiveUploads: computed(() => uploads().some(upload => upload.status === 'UPLOADING')),
  })),
  withMethods((store, customerChatService = inject(CustomerChatService)) => {
    const loadSession = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, errorMessage: null })),
        switchMap(() =>
          customerChatService.getSession().pipe(
            tap({
              next: session =>
                patchState(store, {
                  session,
                  messages: session.messages,
                  sharedItems: session.sharedItems,
                  lastActivityLabel: session.lastActivityLabel,
                  loading: false,
                  errorMessage: null,
                }),
              error: () =>
                patchState(store, {
                  loading: false,
                  errorMessage: 'Không thể tải cuộc trò chuyện. Vui lòng thử lại sau.',
                }),
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
            senderName: store.customer()?.name ?? 'Bạn',
            body,
            sentAtLabel: 'Vừa xong',
            attachments: [],
          };

          patchState(store, {
            messages: [...store.messages(), message],
            sending: true,
            lastActivityLabel: 'Vừa xong',
          });
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
                  const responseMessage: CustomerChatMessage = {
                    id: `chat-response-${Date.now()}`,
                    sender: store.staffJoined() ? 'STAFF' : 'AI',
                    senderName: responder?.name ?? 'ZenTech',
                    body: responseBody,
                    sentAtLabel: 'Vừa xong',
                    attachments: [],
                  };

                  patchState(store, {
                    messages: [...store.messages(), responseMessage],
                    sending: false,
                    lastActivityLabel: 'Vừa xong',
                  });
                },
                error: () =>
                  patchState(store, {
                    sending: false,
                    errorMessage: 'Tin nhắn chưa gửi được. Vui lòng thử lại.',
                  }),
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
          const uploads = files.map(file => ({
            id: `upload-${Date.now()}-${file.name}`,
            fileName: file.name,
            sizeLabel: formatFileSize(file.size),
            progress: 38,
            status: 'UPLOADING' as const,
          }));

          patchState(store, { uploads: [...store.uploads(), ...uploads] });
        }),
        switchMap(files =>
          customerChatService.uploadCustomerFiles(files).pipe(
            tap({
              next: results => {
                const resultNames = new Set(results.map(result => result.title));

                patchState(store, {
                  uploads: store.uploads().map(upload =>
                    resultNames.has(upload.fileName)
                      ? { ...upload, progress: 100, status: 'COMPLETE' }
                      : upload
                  ),
                  sharedItems: [
                    ...results.map(result => ({
                      id: result.id,
                      type: result.type,
                      title: result.title,
                      subtitle: result.subtitle,
                      url: result.url,
                      thumbnailUrl: result.type === 'IMAGE' ? result.url : null,
                    })),
                    ...store.sharedItems(),
                  ],
                  activeSharedTab: results.some(result => result.type === 'IMAGE')
                    ? 'MEDIA'
                    : 'FILES',
                  sharedSidebarOpen: true,
                });
              },
              error: () =>
                patchState(store, {
                  uploads: store.uploads().map(upload =>
                    upload.status === 'UPLOADING'
                      ? { ...upload, status: 'FAILED', progress: 100 }
                      : upload
                  ),
                  errorMessage: 'Không thể tải tệp lên. Vui lòng thử lại.',
                }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    return {
      loadSession,
      sendMessage,
      selectFiles,
      openPopup(): void {
        patchState(store, { popupOpen: true, sharedSidebarOpen: false });
      },
      closePopup(): void {
        patchState(store, { popupOpen: false });
      },
      togglePopup(): void {
        patchState(store, { popupOpen: !store.popupOpen() });
      },
      openFullChat(): void {
        patchState(store, {
          popupOpen: false,
          sharedSidebarOpen: true,
        });
      },
      removeUpload(uploadId: string): void {
        patchState(store, {
          uploads: store.uploads().filter(upload => upload.id !== uploadId),
        });
      },
      setSharedContentTab(activeSharedTab: CustomerChatSharedTab): void {
        patchState(store, { activeSharedTab, sharedSidebarOpen: true });
      },
      toggleSharedSidebar(): void {
        patchState(store, { sharedSidebarOpen: !store.sharedSidebarOpen() });
      },
      closeSharedSidebar(): void {
        patchState(store, { sharedSidebarOpen: false });
      },
    };
  })
);

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
