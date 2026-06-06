import { inject, Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthStorageService } from './auth-storage.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationWebsocketService {
  private readonly authStorageService = inject(AuthStorageService);
  private client: Client | null = null;
  private readonly connectionState$ = new BehaviorSubject<boolean>(false);

  get isConnected$(): Observable<boolean> {
    return this.connectionState$.asObservable();
  }

  get isConnected(): boolean {
    return this.connectionState$.value;
  }

  connect(): void {
    if (this.client && this.client.active) {
      return;
    }

    const token = this.authStorageService.getAccessToken();
    const wsUrl = 'ws://localhost:8080/ws';

    this.client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      beforeConnect: () => {
        const token = this.authStorageService.getAccessToken();
        this.client!.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      },
      onConnect: () => {
        this.connectionState$.next(true);
      },
      onDisconnect: () => {
        this.connectionState$.next(false);
      },
      onStompError: (frame) => {
        console.error('[Notification WS Error]', frame.headers['message']);
        this.connectionState$.next(false);
      },
      onWebSocketClose: () => {
        this.connectionState$.next(false);
      },
    });

    this.client.activate();
  }

  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.connectionState$.next(false);
    }
  }

  subscribe<T>(destination: string): Observable<T> {
    return new Observable<T>((observer) => {
      let stompSubscription: any = null;

      const sub = this.connectionState$.subscribe((connected) => {
        if (connected && this.client && this.client.connected) {
          stompSubscription = this.client.subscribe(destination, (message: IMessage) => {
            try {
              const body = JSON.parse(message.body) as T;
              observer.next(body);
            } catch (e) {
              console.error('[Notification WS] Failed to parse payload', e);
            }
          });
        }
      });

      return () => {
        sub.unsubscribe();
        if (stompSubscription) {
          stompSubscription.unsubscribe();
        }
      };
    });
  }
}
