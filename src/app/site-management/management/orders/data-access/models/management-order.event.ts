import {
  ManagementOrder,
  ManagementOrderDateFilter,
  ManagementOrderEditDraft,
  ManagementOrderFormErrors,
  ManagementOrderPage,
  ManagementOrderQuery,
  ManagementOrderStatusFilter,
} from './management-order.models';

export enum ManagementOrderEventType {
  OrdersLoadStarted = 'Orders Load Started',
  OrdersLoadSucceeded = 'Orders Load Succeeded',
  OrdersLoadFailed = 'Orders Load Failed',
  SearchKeywordChanged = 'Search Keyword Changed',
  StatusFilterChanged = 'Status Filter Changed',
  DateFilterChanged = 'Date Filter Changed',
  FiltersApplied = 'Filters Applied',
  FiltersReset = 'Filters Reset',
  PageChanged = 'Page Changed',
  OrderSelected = 'Order Selected',
  EditClicked = 'Edit Clicked',
  DrawerClosed = 'Drawer Closed',
  EditDraftChanged = 'Edit Draft Changed',
  EditQuantityChanged = 'Edit Quantity Changed',
  EditCancelled = 'Edit Cancelled',
  EditSubmitted = 'Edit Submitted',
  EditValidationFailed = 'Edit Validation Failed',
  EditSucceeded = 'Edit Succeeded',
  EditFailed = 'Edit Failed',
  DeliveryMarked = 'Delivery Marked',
  MessagesCleared = 'Messages Cleared',
}

export type ManagementOrderEvent =
  | { type: ManagementOrderEventType.OrdersLoadStarted }
  | { type: ManagementOrderEventType.OrdersLoadSucceeded; page: ManagementOrderPage }
  | { type: ManagementOrderEventType.OrdersLoadFailed }
  | { type: ManagementOrderEventType.SearchKeywordChanged; keyword: string }
  | { type: ManagementOrderEventType.StatusFilterChanged; status: ManagementOrderStatusFilter }
  | { type: ManagementOrderEventType.DateFilterChanged; dateFilter: ManagementOrderDateFilter }
  | { type: ManagementOrderEventType.FiltersApplied }
  | { type: ManagementOrderEventType.FiltersReset; query: ManagementOrderQuery }
  | { type: ManagementOrderEventType.PageChanged; page: number }
  | { type: ManagementOrderEventType.OrderSelected; orderId: string }
  | { type: ManagementOrderEventType.EditClicked; order: ManagementOrder; draft: ManagementOrderEditDraft | null }
  | { type: ManagementOrderEventType.DrawerClosed }
  | { type: ManagementOrderEventType.EditDraftChanged; patch: Partial<ManagementOrderEditDraft> }
  | { type: ManagementOrderEventType.EditQuantityChanged; orderItemId: string; quantity: number }
  | { type: ManagementOrderEventType.EditCancelled }
  | { type: ManagementOrderEventType.EditSubmitted }
  | { type: ManagementOrderEventType.EditValidationFailed; errors: ManagementOrderFormErrors }
  | { type: ManagementOrderEventType.EditSucceeded; order: ManagementOrder }
  | { type: ManagementOrderEventType.EditFailed }
  | { type: ManagementOrderEventType.DeliveryMarked; order: ManagementOrder }
  | { type: ManagementOrderEventType.MessagesCleared };
