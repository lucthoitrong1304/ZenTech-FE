import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../api/api.service';
import { NOTIFICATION_API_ENDPOINTS } from '../api/notification-api-endpoints';
import { INotification, IUnreadCountResponse, IPageResponse } from '../models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly apiService = inject(ApiService);

  getNotifications(page: number = 0, size: number = 20): Observable<IPageResponse<INotification>> {
    return this.apiService.get<IPageResponse<INotification>>(NOTIFICATION_API_ENDPOINTS.GET_NOTIFICATIONS, {
      params: { page, size },
    });
  }

  getUnreadCount(): Observable<IUnreadCountResponse> {
    return this.apiService.getText(NOTIFICATION_API_ENDPOINTS.GET_UNREAD_COUNT).pipe(
      map(countText => ({ count: Number(countText) }))
    );
  }

  markAsRead(id: string): Observable<string> {
    return this.apiService.putText<void>(NOTIFICATION_API_ENDPOINTS.MARK_AS_READ(id), undefined);
  }

  markAllAsRead(): Observable<string> {
    return this.apiService.putText<void>(NOTIFICATION_API_ENDPOINTS.MARK_ALL_AS_READ, undefined);
  }
}
