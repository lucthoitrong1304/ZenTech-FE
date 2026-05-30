export const NOTIFICATION_API_ENDPOINTS = {
  GET_NOTIFICATIONS: '/api/notifications',
  GET_UNREAD_COUNT: '/api/notifications/unread-count',
  MARK_AS_READ: (id: string) => `/api/notifications/${id}/read`,
  MARK_ALL_AS_READ: '/api/notifications/read-all',
};
