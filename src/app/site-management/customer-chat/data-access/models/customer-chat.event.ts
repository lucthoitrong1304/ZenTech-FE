import {
  CustomerChatMessage,
  CustomerChatSession,
  CustomerChatSharedItem,
  CustomerChatSharedTab,
  CustomerChatUpload,
} from './customer-chat.models';

export enum CustomerChatEventType {
  SessionLoadStarted = 'Session Load Started',
  SessionLoadSucceeded = 'Session Load Succeeded',
  SessionLoadFailed = 'Session Load Failed',
  CustomerMessageQueued = 'Customer Message Queued',
  CustomerMessageResponded = 'Customer Message Responded',
  CustomerMessageFailed = 'Customer Message Failed',
  UploadsQueued = 'Uploads Queued',
  UploadsSucceeded = 'Uploads Succeeded',
  UploadsFailed = 'Uploads Failed',
  PopupOpened = 'Popup Opened',
  PopupClosed = 'Popup Closed',
  PopupToggled = 'Popup Toggled',
  FullChatOpened = 'Full Chat Opened',
  SharedContentRequested = 'Shared Content Requested',
  ConversationDetailsRequested = 'Conversation Details Requested',
  UploadRemoved = 'Upload Removed',
  SharedContentTabChanged = 'Shared Content Tab Changed',
  SharedSidebarToggled = 'Shared Sidebar Toggled',
  SharedSidebarClosed = 'Shared Sidebar Closed',
}

export type CustomerChatEvent =
  | { type: CustomerChatEventType.SessionLoadStarted }
  | { type: CustomerChatEventType.SessionLoadSucceeded; session: CustomerChatSession }
  | { type: CustomerChatEventType.SessionLoadFailed }
  | { type: CustomerChatEventType.CustomerMessageQueued; message: CustomerChatMessage }
  | { type: CustomerChatEventType.CustomerMessageResponded; message: CustomerChatMessage }
  | { type: CustomerChatEventType.CustomerMessageFailed }
  | { type: CustomerChatEventType.UploadsQueued; uploads: CustomerChatUpload[] }
  | {
      type: CustomerChatEventType.UploadsSucceeded;
      uploadFileNames: string[];
      sharedItems: CustomerChatSharedItem[];
      activeSharedTab: CustomerChatSharedTab;
    }
  | { type: CustomerChatEventType.UploadsFailed; conversationId: string }
  | { type: CustomerChatEventType.PopupOpened }
  | { type: CustomerChatEventType.PopupClosed }
  | { type: CustomerChatEventType.PopupToggled; popupOpen: boolean }
  | { type: CustomerChatEventType.FullChatOpened }
  | { type: CustomerChatEventType.SharedContentRequested }
  | { type: CustomerChatEventType.ConversationDetailsRequested }
  | { type: CustomerChatEventType.UploadRemoved; uploadId: string }
  | { type: CustomerChatEventType.SharedContentTabChanged; activeSharedTab: CustomerChatSharedTab }
  | { type: CustomerChatEventType.SharedSidebarToggled; sharedSidebarOpen: boolean }
  | { type: CustomerChatEventType.SharedSidebarClosed };
