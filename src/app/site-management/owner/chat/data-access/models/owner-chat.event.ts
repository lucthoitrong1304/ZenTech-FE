import {
  OwnerChatConversation,
  OwnerChatExpertRequestFilter,
  OwnerChatMediaTab,
  OwnerChatMessage,
  OwnerChatStatusFilter,
  OwnerChatWorkspace,
} from './owner-chat.models';

export enum OwnerChatEventType {
  WorkspaceLoadStarted = 'Workspace Load Started',
  WorkspaceLoadSucceeded = 'Workspace Load Succeeded',
  WorkspaceLoadFailed = 'Workspace Load Failed',
  ConversationSelected = 'Conversation Selected',
  SelectionCleared = 'Selection Cleared',
  SearchKeywordChanged = 'Search Keyword Changed',
  StatusFilterChanged = 'Status Filter Changed',
  ExpertRequestFilterChanged = 'Expert Request Filter Changed',
  MediaDrawerToggled = 'Media Drawer Toggled',
  MediaDrawerOpened = 'Media Drawer Opened',
  MediaDrawerClosed = 'Media Drawer Closed',
  MediaTabChanged = 'Media Tab Changed',
  ConversationAccepted = 'Conversation Accepted',
  ConversationClosed = 'Conversation Closed',
  StaffMessageSubmitted = 'Staff Message Submitted',
}

export type OwnerChatEvent =
  | { type: OwnerChatEventType.WorkspaceLoadStarted }
  | { type: OwnerChatEventType.WorkspaceLoadSucceeded; workspace: OwnerChatWorkspace }
  | { type: OwnerChatEventType.WorkspaceLoadFailed }
  | { type: OwnerChatEventType.ConversationSelected; conversationId: string }
  | { type: OwnerChatEventType.SelectionCleared }
  | { type: OwnerChatEventType.SearchKeywordChanged; searchKeyword: string }
  | { type: OwnerChatEventType.StatusFilterChanged; statusFilter: OwnerChatStatusFilter }
  | {
      type: OwnerChatEventType.ExpertRequestFilterChanged;
      expertRequestFilter: OwnerChatExpertRequestFilter;
    }
  | { type: OwnerChatEventType.MediaDrawerToggled; open: boolean }
  | { type: OwnerChatEventType.MediaDrawerOpened }
  | { type: OwnerChatEventType.MediaDrawerClosed }
  | { type: OwnerChatEventType.MediaTabChanged; activeMediaTab: OwnerChatMediaTab }
  | { type: OwnerChatEventType.ConversationAccepted; conversationId: string }
  | { type: OwnerChatEventType.ConversationClosed; conversationId: string }
  | {
      type: OwnerChatEventType.StaffMessageSubmitted;
      conversation: OwnerChatConversation;
      message: OwnerChatMessage;
    };
