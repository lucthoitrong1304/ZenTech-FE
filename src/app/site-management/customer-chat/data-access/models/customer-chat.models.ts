export type CustomerChatSessionStatus = 'AI_ASSISTING' | 'STAFF_JOINED';

export type CustomerChatMessageSender = 'CUSTOMER' | 'AI' | 'STAFF';

export type CustomerChatSharedItemType = 'IMAGE' | 'VIDEO' | 'FILE' | 'LINK';

export type CustomerChatSharedTab = 'MEDIA' | 'FILES' | 'LINKS';

export type CustomerChatUploadStatus = 'UPLOADING' | 'COMPLETE' | 'FAILED';

export interface CustomerChatParticipant {
  id: string;
  name: string;
  roleLabel: string;
  avatarUrl: string | null;
  initials: string;
  online: boolean;
}

export interface CustomerChatProductContext {
  id: string;
  name: string;
  imageUrl: string;
  priceLabel: string;
  stockLabel: string;
}

export interface CustomerChatMessageAttachment {
  id: string;
  type: CustomerChatSharedItemType;
  title: string;
  url: string;
  thumbnailUrl: string | null;
}

export interface CustomerChatMessage {
  id: string;
  sender: CustomerChatMessageSender;
  senderName: string;
  body: string;
  sentAtLabel: string;
  attachments: CustomerChatMessageAttachment[];
}

export interface CustomerChatSharedItem {
  id: string;
  type: CustomerChatSharedItemType;
  title: string;
  subtitle: string;
  url: string;
  thumbnailUrl: string | null;
}

export interface CustomerChatUpload {
  id: string;
  fileName: string;
  sizeLabel: string;
  progress: number;
  status: CustomerChatUploadStatus;
}

export interface CustomerChatSession {
  id: string;
  status: CustomerChatSessionStatus;
  customer: CustomerChatParticipant;
  assistant: CustomerChatParticipant;
  staff: CustomerChatParticipant | null;
  product: CustomerChatProductContext;
  messages: CustomerChatMessage[];
  sharedItems: CustomerChatSharedItem[];
  lastActivityLabel: string;
}

export interface CustomerChatSendMessagePayload {
  sessionId: string;
  body: string;
  staffJoined: boolean;
}

export interface CustomerChatUploadResult {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  type: CustomerChatSharedItemType;
}
