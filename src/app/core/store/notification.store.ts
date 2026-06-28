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
import { catchError, EMPTY, pipe, Subscription, mergeMap, tap, switchMap } from 'rxjs';
import { INotification } from '../models/notification.model';
import { NotificationService } from '../services/notification.service';
import { WebsocketService } from '../services/websocket.service';

interface NotificationState {
  accountId: string | null;
  unreadCount: number;
  loading: boolean;
  isOpen: boolean;
}

const NOTIFICATION_ENTITY_CONFIG = {
  collection: 'notification',
  selectId: (n: INotification) => n.id,
} as const;

export const NotificationStore = signalStore(
  { providedIn: 'root' },
  withState<NotificationState>({
    accountId: null,
    unreadCount: 0,
    loading: false,
    isOpen: false,
  }),
  withEntities<INotification, 'notification'>({
    entity: {} as INotification,
    collection: 'notification',
  }),
  withComputed(({ notificationEntities, unreadCount, isOpen }) => ({
    notifications: computed(() => {
      const sorted = [...notificationEntities()].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return sorted;
    }),
    calculatedUnreadCount: computed(() => {
      return notificationEntities().filter(n => !n.isRead).length;
    }),
    hasUnread: computed(() => {
      return notificationEntities().some(n => !n.isRead);
    }),
    isPopoverOpen: computed(() => isOpen()),
  })),
  withMethods((
    store,
    notificationService = inject(NotificationService),
    wsService = inject(WebsocketService)
  ) => {
    let wsSubscription: Subscription | null = null;

    const stopWebSocket = (): void => {
      if (wsSubscription) {
        wsSubscription.unsubscribe();
        wsSubscription = null;
      }
      wsService.disconnect();
    };

    const startWebSocket = (): void => {
      wsService.connect();
      if (wsSubscription) {
        wsSubscription.unsubscribe();
      }
      wsSubscription = wsService.subscribe<INotification>('/user/queue/notifications')
        .subscribe(notification => {
          handleNewNotification(notification);
        });
    };

    const loadNotifications = rxMethod<void>(
      pipe(
        tap(() => {
          if (!store.accountId()) {
            return;
          }
          patchState(store, { loading: true });
        }),
        switchMap(() =>
          !store.accountId()
            ? EMPTY
            :
          notificationService.getNotifications(0, 20).pipe(
            tap({
              next: (page) => {
                patchState(
                  store,
                  setAllEntities(page.content, NOTIFICATION_ENTITY_CONFIG),
                  { loading: false }
                );
              },
              error: () => patchState(store, { loading: false }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadUnreadCount = rxMethod<void>(
      pipe(
        switchMap(() =>
          !store.accountId()
            ? EMPTY
            :
          notificationService.getUnreadCount().pipe(
            tap((res) => patchState(store, { unreadCount: res.count })),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const markAsRead = rxMethod<string>(
      pipe(
        tap((id) => {
          patchState(
            store,
            updateEntity({ id, changes: { isRead: true } }, NOTIFICATION_ENTITY_CONFIG),
            { unreadCount: Math.max(0, store.unreadCount() - 1) }
          );
        }),
        mergeMap((id) =>
          notificationService.markAsRead(id).pipe(
            catchError((err) => {
              console.error('Failed to mark notification as read:', err);
              loadNotifications();
              loadUnreadCount();
              return EMPTY;
            })
          )
        )
      )
    );

    const markAllAsRead = rxMethod<void>(
      pipe(
        tap(() => {
          const currentNotifications = store.notificationEntities();
          const updated = currentNotifications.map(n => ({ id: n.id, changes: { isRead: true } }));
          
          patchState(store, { unreadCount: 0 });
          updated.forEach(update => {
            patchState(store, updateEntity(update, NOTIFICATION_ENTITY_CONFIG));
          });
        }),
        mergeMap(() =>
          notificationService.markAllAsRead().pipe(
            catchError((err) => {
              console.error('Failed to mark all notifications as read:', err);
              return EMPTY;
            })
          )
        )
      )
    );

    const handleNewNotification = (notification: INotification) => {
      patchState(
        store,
        addEntity(notification, NOTIFICATION_ENTITY_CONFIG),
        { unreadCount: store.unreadCount() + 1 }
      );
    };

    return {
      loadNotifications,
      loadUnreadCount,
      markAsRead,
      markAllAsRead,
      togglePopover(open: boolean) {
        patchState(store, { isOpen: open });
      },
      resetForAccount(accountId: string | null) {
        if (store.accountId() === accountId) {
          if (accountId && store.notificationEntities().length === 0) {
            loadNotifications();
            loadUnreadCount();
            startWebSocket();
          }
          return;
        }

        stopWebSocket();
        patchState(
          store,
          removeAllEntities(NOTIFICATION_ENTITY_CONFIG),
          {
            accountId,
            unreadCount: 0,
            loading: false,
            isOpen: false,
          }
        );

        if (accountId) {
          loadNotifications();
          loadUnreadCount();
          startWebSocket();
        }
      },
      initWebSocket() {
        if (store.accountId()) {
          startWebSocket();
        }
      },
      destroyWebSocket() {
        stopWebSocket();
      }
    };
  }),
  withHooks({
    onDestroy(store) {
      store.destroyWebSocket();
    }
  })
);
