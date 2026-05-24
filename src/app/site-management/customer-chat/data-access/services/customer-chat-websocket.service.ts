import { Injectable, inject } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthStorageService } from '../../../../core/services/auth-storage.service';

@Injectable({
  providedIn: 'root',
})
export class CustomerChatWebsocketService {
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
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        this.connectionState$.next(true);
      },
      onDisconnect: () => {
        this.connectionState$.next(false);
      },
      onStompError: (frame) => {
        console.error('[STOMP Error]', frame.headers['message']);
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
              console.error('[STOMP Subscribe Error] Failed to parse payload', e);
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

  publish(destination: string, body: any): void {
    if (this.client && this.client.connected) {
      this.client.publish({
        destination,
        body: JSON.stringify(body),
      });
    } else {
      console.warn('[STOMP Publish Warning] Client is not connected. Message dropped.');
    }
  }
}
