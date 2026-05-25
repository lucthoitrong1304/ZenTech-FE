export type OwnerChatConversationStatus = 'AI_ASSISTING' | 'WAITING_STAFF' | 'STAFF_HANDLING' | 'CLOSED';

export type OwnerChatExpertRequestStatus = 'WAITING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

export type OwnerChatStatusFilter = OwnerChatConversationStatus | 'ALL';

export type OwnerChatExpertRequestFilter = OwnerChatExpertRequestStatus | 'ALL';

export type OwnerChatMessageSender = 'CUSTOMER' | 'AI' | 'STAFF';

export type OwnerChatMediaType = 'IMAGE' | 'VIDEO' | 'FILE' | 'LINK';

export type OwnerChatMediaTab = 'ALL' | 'MEDIA' | 'FILES' | 'LINKS';

export type OwnerChatUploadStatus = 'PENDING' | 'UPLOADING' | 'FAILED';

export interface OwnerChatCustomer {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  initials: string;
  online: boolean;
}

export interface OwnerChatConversation {
  id: string;
  customer: OwnerChatCustomer;
  status: OwnerChatConversationStatus;
  expertRequestStatus: OwnerChatExpertRequestStatus | null;
  lastMessagePreview: string;
  lastMessageAtLabel: string;
  unreadCount: number;
  productContext: string;
}

export interface OwnerChatMessageAttachment {
  id: string;
  type: OwnerChatMediaType;
  title: string;
  url: string;
  thumbnailUrl: string | null;
}

export interface OwnerChatMessage {
  id: string;
  conversationId: string;
  sender: OwnerChatMessageSender;
  senderName: string;
  body: string;
  sentAtLabel: string;
  attachments: OwnerChatMessageAttachment[];
}

export interface OwnerChatMediaItem {
  id: string;
  conversationId: string;
  type: OwnerChatMediaType;
  title: string;
  subtitle: string;
  url: string;
  thumbnailUrl: string | null;
}

export interface OwnerChatUpload {
  id: string;
  conversationId: string;
  file: File;
  fileName: string;
  sizeLabel: string;
  progress: number;
  status: OwnerChatUploadStatus;
}

export interface OwnerChatWorkspace {
  conversations: OwnerChatConversation[];
  messages: OwnerChatMessage[];
  mediaItems: OwnerChatMediaItem[];
}

export interface OwnerChatStatusCount {
  status: OwnerChatConversationStatus;
  label: string;
  count: number;
}

export interface OwnerChatExpertRequestCount {
  status: OwnerChatExpertRequestStatus;
  label: string;
  count: number;
}
