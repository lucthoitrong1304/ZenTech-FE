export type ManagementChatConversationStatus = 'AI_ASSISTING' | 'WAITING_STAFF' | 'STAFF_HANDLING' | 'CLOSED';

export type ManagementChatExpertRequestStatus = 'WAITING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

export type ManagementChatStatusFilter = ManagementChatConversationStatus | 'ALL';

export type ManagementChatExpertRequestFilter = ManagementChatExpertRequestStatus | 'ALL';

export type ManagementChatMessageSender = 'CUSTOMER' | 'AI' | 'STAFF';

export type ManagementChatMediaType = 'IMAGE' | 'VIDEO' | 'FILE' | 'LINK';

export type ManagementChatMediaTab = 'ALL' | 'MEDIA' | 'FILES' | 'LINKS';

export type ManagementChatUploadStatus = 'PENDING' | 'UPLOADING' | 'FAILED';

export interface ManagementChatCustomer {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  initials: string;
  online: boolean;
}

export interface ManagementChatConversation {
  id: string;
  customer: ManagementChatCustomer;
  status: ManagementChatConversationStatus;
  expertRequestStatus: ManagementChatExpertRequestStatus | null;
  lastMessagePreview: string;
  lastMessageAtLabel: string;
  unreadCount: number;
  productContext: string;
}

export interface ManagementChatMessageAttachment {
  id: string;
  type: ManagementChatMediaType;
  title: string;
  url: string;
  thumbnailUrl: string | null;
}

export interface ManagementChatMessage {
  id: string;
  conversationId: string;
  sender: ManagementChatMessageSender;
  senderName: string;
  body: string;
  sentAtLabel: string;
  attachments: ManagementChatMessageAttachment[];
}

export interface ManagementChatMediaItem {
  id: string;
  conversationId: string;
  type: ManagementChatMediaType;
  title: string;
  subtitle: string;
  url: string;
  thumbnailUrl: string | null;
}

export interface ManagementChatUpload {
  id: string;
  conversationId: string;
  file: File;
  fileName: string;
  sizeLabel: string;
  progress: number;
  status: ManagementChatUploadStatus;
}

export interface ManagementChatWorkspace {
  conversations: ManagementChatConversation[];
  messages: ManagementChatMessage[];
  mediaItems: ManagementChatMediaItem[];
}

export interface ManagementChatStatusCount {
  status: ManagementChatConversationStatus;
  label: string;
  count: number;
}

export interface ManagementChatExpertRequestCount {
  status: ManagementChatExpertRequestStatus;
  label: string;
  count: number;
}
