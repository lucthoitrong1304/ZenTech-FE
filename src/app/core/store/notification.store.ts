import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { addEntity, setAllEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, pipe, Subscription, switchMap, tap } from 'rxjs';
import { INotification } from '../models/notification.model';
import { NotificationService } from '../services/notification.service';
import { NotificationWebsocketService } from '../services/notification-websocket.service';

interface NotificationState {
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
    hasUnread: computed(() => unreadCount() > 0),
    isPopoverOpen: computed(() => isOpen()),
  })),
  withMethods((
    store,
    notificationService = inject(NotificationService),
    wsService = inject(NotificationWebsocketService)
  ) => {
    let wsSubscription: Subscription | null = null;

    const loadNotifications = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true })),
        switchMap(() =>
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
          notificationService.getUnreadCount().pipe(
            tap((res) => patchState(store, { unreadCount: res.count })),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const markAsRead = rxMethod<string>(
      pipe(
        switchMap((id) =>
          notificationService.markAsRead(id).pipe(
            tap(() => {
              patchState(
                store,
                updateEntity({ id, changes: { isRead: true } }, NOTIFICATION_ENTITY_CONFIG),
                { unreadCount: Math.max(0, store.unreadCount() - 1) }
              );
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const markAllAsRead = rxMethod<void>(
      pipe(
        switchMap(() =>
          notificationService.markAllAsRead().pipe(
            tap(() => {
              const currentNotifications = store.notificationEntities();
              const updated = currentNotifications.map(n => ({ id: n.id, changes: { isRead: true } }));
              
              const newState: any = { unreadCount: 0 };
              
              patchState(store, newState);
              // Cập nhật từng entity
              updated.forEach(update => {
                patchState(store, updateEntity(update, NOTIFICATION_ENTITY_CONFIG));
              });
            }),
            catchError(() => EMPTY)
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
      initWebSocket() {
        wsService.connect();
        if (wsSubscription) {
          wsSubscription.unsubscribe();
        }
        wsSubscription = wsService.subscribe<INotification>('/user/queue/notifications')
          .subscribe(notification => {
            handleNewNotification(notification);
          });
      },
      destroyWebSocket() {
        if (wsSubscription) {
          wsSubscription.unsubscribe();
        }
        wsService.disconnect();
      }
    };
  }),
  withHooks({
    onInit(store) {
      store.loadNotifications();
      store.loadUnreadCount();
      store.initWebSocket();
    },
    onDestroy(store) {
      store.destroyWebSocket();
    }
  })
);
