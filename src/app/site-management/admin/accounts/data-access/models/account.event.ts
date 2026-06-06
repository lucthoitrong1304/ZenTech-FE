import {
  AccountActiveFilter,
  AccountDialogMode,
  AccountSummary,
  AdminAccountRole,
  PageResponse,
} from './account.model';

export enum AccountEventType {
  LoadRequested = 'LOAD_REQUESTED',
  LoadSucceeded = 'LOAD_SUCCEEDED',
  LoadFailed = 'LOAD_FAILED',
  SearchKeywordChanged = 'SEARCH_KEYWORD_CHANGED',
  RoleFilterChanged = 'ROLE_FILTER_CHANGED',
  ActiveFilterChanged = 'ACTIVE_FILTER_CHANGED',
  PageChanged = 'PAGE_CHANGED',
  CreateDialogOpened = 'CREATE_DIALOG_OPENED',
  EditRoleDialogOpened = 'EDIT_ROLE_DIALOG_OPENED',
  DialogClosed = 'DIALOG_CLOSED',
  CreateSucceeded = 'CREATE_SUCCEEDED',
  CreateFailed = 'CREATE_FAILED',
  RoleUpdateSucceeded = 'ROLE_UPDATE_SUCCEEDED',
  RoleUpdateFailed = 'ROLE_UPDATE_FAILED',
  StatusUpdateSucceeded = 'STATUS_UPDATE_SUCCEEDED',
  StatusUpdateFailed = 'STATUS_UPDATE_FAILED',
}

export interface LoadRequestedEvent {
  type: AccountEventType.LoadRequested;
}

export interface LoadSucceededEvent {
  type: AccountEventType.LoadSucceeded;
  page: PageResponse<AccountSummary>;
}

export interface LoadFailedEvent {
  type: AccountEventType.LoadFailed;
}

export interface SearchKeywordChangedEvent {
  type: AccountEventType.SearchKeywordChanged;
  keyword: string;
}

export interface RoleFilterChangedEvent {
  type: AccountEventType.RoleFilterChanged;
  role: AdminAccountRole | null;
}

export interface ActiveFilterChangedEvent {
  type: AccountEventType.ActiveFilterChanged;
  activeFilter: AccountActiveFilter;
}

export interface PageChangedEvent {
  type: AccountEventType.PageChanged;
  page: number;
  size: number;
}

export interface CreateDialogOpenedEvent {
  type: AccountEventType.CreateDialogOpened;
}

export interface EditRoleDialogOpenedEvent {
  type: AccountEventType.EditRoleDialogOpened;
  account: AccountSummary;
}

export interface DialogClosedEvent {
  type: AccountEventType.DialogClosed;
}

export interface CreateSucceededEvent {
  type: AccountEventType.CreateSucceeded;
}

export interface CreateFailedEvent {
  type: AccountEventType.CreateFailed;
}

export interface RoleUpdateSucceededEvent {
  type: AccountEventType.RoleUpdateSucceeded;
}

export interface RoleUpdateFailedEvent {
  type: AccountEventType.RoleUpdateFailed;
}

export interface StatusUpdateSucceededEvent {
  type: AccountEventType.StatusUpdateSucceeded;
}

export interface StatusUpdateFailedEvent {
  type: AccountEventType.StatusUpdateFailed;
}

export type AccountEvent =
  | LoadRequestedEvent
  | LoadSucceededEvent
  | LoadFailedEvent
  | SearchKeywordChangedEvent
  | RoleFilterChangedEvent
  | ActiveFilterChangedEvent
  | PageChangedEvent
  | CreateDialogOpenedEvent
  | EditRoleDialogOpenedEvent
  | DialogClosedEvent
  | CreateSucceededEvent
  | CreateFailedEvent
  | RoleUpdateSucceededEvent
  | RoleUpdateFailedEvent
  | StatusUpdateSucceededEvent
  | StatusUpdateFailedEvent;

export const ACCOUNT_DIALOG_CLOSED_EVENT: DialogClosedEvent = {
  type: AccountEventType.DialogClosed,
};

export const ACCOUNT_CREATE_DIALOG_OPENED_EVENT: CreateDialogOpenedEvent = {
  type: AccountEventType.CreateDialogOpened,
};

export const ACCOUNT_LOAD_REQUESTED_EVENT: LoadRequestedEvent = {
  type: AccountEventType.LoadRequested,
};

export const DEFAULT_ACCOUNT_DIALOG_MODE = AccountDialogMode.None;
