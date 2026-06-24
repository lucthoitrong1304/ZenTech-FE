import { environment } from '../../../environments/environment';

const notificationBaseUrl = `${environment.apiBaseUrl}/notifications`;

export const NOTIFICATION_API_ENDPOINTS = {
  GET_NOTIFICATIONS: notificationBaseUrl,
  GET_UNREAD_COUNT: `${notificationBaseUrl}/unread-count`,
  MARK_AS_READ: (id: string) => `${notificationBaseUrl}/${id}/read`,
  MARK_ALL_AS_READ: `${notificationBaseUrl}/read-all`,
};
