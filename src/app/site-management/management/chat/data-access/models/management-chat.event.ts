import {
  ManagementChatConversation,
  ManagementChatExpertRequestFilter,
  ManagementChatMediaTab,
  ManagementChatMessage,
  ManagementChatStatusFilter,
  ManagementChatWorkspace,
} from './management-chat.models';
import { ChatMessageResponse } from '../../../../customer-chat/data-access/models/customer-chat.models';

export enum ManagementChatEventType {
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
  SearchRequested = 'Search Requested',
  SearchSidebarToggled = 'Search Sidebar Toggled',
  SearchMessagesStarted = 'Search Messages Started',
  SearchMessagesSucceeded = 'Search Messages Succeeded',
  SearchMessagesFailed = 'Search Messages Failed',
  ConversationAccepted = 'Conversation Accepted',
  ConversationClosed = 'Conversation Closed',
  StaffMessageSubmitted = 'Staff Message Submitted',
}

export type ManagementChatEvent =
  | { type: ManagementChatEventType.WorkspaceLoadStarted }
  | { type: ManagementChatEventType.WorkspaceLoadSucceeded; workspace: ManagementChatWorkspace }
  | { type: ManagementChatEventType.WorkspaceLoadFailed }
  | { type: ManagementChatEventType.ConversationSelected; conversationId: string }
  | { type: ManagementChatEventType.SelectionCleared }
  | { type: ManagementChatEventType.SearchKeywordChanged; searchKeyword: string }
  | { type: ManagementChatEventType.StatusFilterChanged; statusFilter: ManagementChatStatusFilter }
  | {
      type: ManagementChatEventType.ExpertRequestFilterChanged;
      expertRequestFilter: ManagementChatExpertRequestFilter;
    }
  | { type: ManagementChatEventType.MediaDrawerToggled; open: boolean }
  | { type: ManagementChatEventType.MediaDrawerOpened }
  | { type: ManagementChatEventType.MediaDrawerClosed }
  | { type: ManagementChatEventType.MediaTabChanged; activeMediaTab: ManagementChatMediaTab }
  | { type: ManagementChatEventType.SearchRequested }
  | { type: ManagementChatEventType.SearchSidebarToggled; searchSidebarOpen: boolean }
  | { type: ManagementChatEventType.SearchMessagesStarted }
  | { type: ManagementChatEventType.SearchMessagesSucceeded; results: ChatMessageResponse[] }
  | { type: ManagementChatEventType.SearchMessagesFailed }
  | { type: ManagementChatEventType.ConversationAccepted; conversationId: string }
  | { type: ManagementChatEventType.ConversationClosed; conversationId: string }
  | {
      type: ManagementChatEventType.StaffMessageSubmitted;
      conversation: ManagementChatConversation;
      message: ManagementChatMessage;
    };
