export enum NotificationType {
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  ORDER_STATUS = 'ORDER_STATUS',
  SYSTEM = 'SYSTEM',
  PROMOTION = 'PROMOTION',
  AGENT_REQUEST = 'AGENT_REQUEST',
  CONVERSATION_TRANSFER = 'CONVERSATION_TRANSFER',
}

export interface INotification {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  type: NotificationType;
  referenceId: string;
  createdAt: string;
}

export interface IUnreadCountResponse {
  count: number;
}

export interface IPageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
