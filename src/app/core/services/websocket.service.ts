import { inject, Injectable } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthStorageService } from './auth-storage.service';
import { buildWebSocketUrl } from './websocket-url';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
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

    this.client = new Client({
      brokerURL: buildWebSocketUrl(),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      beforeConnect: () => {
        const currentToken = this.authStorageService.getAccessToken();
        this.client!.connectHeaders = currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
      },
      onConnect: () => {
        this.connectionState$.next(true);
      },
      onDisconnect: () => {
        this.connectionState$.next(false);
      },
      onStompError: (frame) => {
        console.error('[System WS Error]', frame.headers['message']);
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
      let stompSubscription: StompSubscription | null = null;

      const sub = this.connectionState$.subscribe((connected) => {
        if (connected && this.client && this.client.connected) {
          if (stompSubscription) {
            try {
              stompSubscription.unsubscribe();
            } catch (e) {
              // Ignore already closed subscriptions
            }
          }
          stompSubscription = this.client.subscribe(destination, (message: IMessage) => {
            try {
              const body = JSON.parse(message.body) as T;
              observer.next(body);
            } catch (e) {
              console.error(`[System WS] Failed to parse payload for ${destination}`, e);
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
