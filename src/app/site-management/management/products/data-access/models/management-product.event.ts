import {
  ManagementProductGroup,
  ManagementProductGroupDraft,
  ManagementProductGroupFormErrors,
  ManagementProductGroupPage,
  ManagementProductGroupQuery,
  ManagementProductOption,
  ManagementProductPage,
  ManagementProductQuery,
  ManagementProductStats,
  ProductFormValue,
  ProductManagementDetailResponse,
} from './management-product.models';

export enum ManagementProductEventType {
  ProductsLoadStarted = 'PRODUCTS_LOAD_STARTED',
  ProductsLoadSucceeded = 'PRODUCTS_LOAD_SUCCEEDED',
  ProductsLoadFailed = 'PRODUCTS_LOAD_FAILED',
  StatsLoadSucceeded = 'STATS_LOAD_SUCCEEDED',
  SearchKeywordChanged = 'SEARCH_KEYWORD_CHANGED',
  CategoryFilterChanged = 'CATEGORY_FILTER_CHANGED',
  StockFilterChanged = 'STOCK_FILTER_CHANGED',
  SortChanged = 'SORT_CHANGED',
  FiltersApplied = 'FILTERS_APPLIED',
  FiltersReset = 'FILTERS_RESET',
  PageChanged = 'PAGE_CHANGED',
  ProductDeleted = 'PRODUCT_DELETED',
  ProductDeleteFailed = 'PRODUCT_DELETE_FAILED',
  MessagesCleared = 'MESSAGES_CLEARED',
  CreateClicked = 'CREATE_CLICKED',
  EditClicked = 'EDIT_CLICKED',
  DetailLoadStarted = 'DETAIL_LOAD_STARTED',
  DetailLoadSucceeded = 'DETAIL_LOAD_SUCCEEDED',
  DetailLoadFailed = 'DETAIL_LOAD_FAILED',
  DialogClosed = 'DIALOG_CLOSED',
  FormValueChanged = 'FORM_VALUE_CHANGED',
  SubmitClicked = 'SUBMIT_CLICKED',
  CreateSucceeded = 'CREATE_SUCCEEDED',
  UpdateSucceeded = 'UPDATE_SUCCEEDED',
  SaveFailed = 'SAVE_FAILED',
}

export type ManagementProductEvent =
  | { type: ManagementProductEventType.ProductsLoadStarted }
  | { type: ManagementProductEventType.ProductsLoadSucceeded; page: ManagementProductPage }
  | { type: ManagementProductEventType.ProductsLoadFailed }
  | { type: ManagementProductEventType.StatsLoadSucceeded; stats: ManagementProductStats }
  | { type: ManagementProductEventType.SearchKeywordChanged; keyword: string }
  | { type: ManagementProductEventType.CategoryFilterChanged; categoryId: string }
  | { type: ManagementProductEventType.StockFilterChanged; stockStatus: ManagementProductQuery['stockStatus'] }
  | { type: ManagementProductEventType.SortChanged; sort: ManagementProductQuery['sort'] }
  | { type: ManagementProductEventType.FiltersApplied }
  | { type: ManagementProductEventType.FiltersReset; query: ManagementProductQuery }
  | { type: ManagementProductEventType.PageChanged; page: number }
  | { type: ManagementProductEventType.ProductDeleted; productId: string }
  | { type: ManagementProductEventType.ProductDeleteFailed }
  | { type: ManagementProductEventType.MessagesCleared }
  | { type: ManagementProductEventType.CreateClicked }
  | { type: ManagementProductEventType.EditClicked; productId: string }
  | { type: ManagementProductEventType.DetailLoadStarted }
  | { type: ManagementProductEventType.DetailLoadSucceeded; detail: ProductManagementDetailResponse }
  | { type: ManagementProductEventType.DetailLoadFailed }
  | { type: ManagementProductEventType.DialogClosed }
  | { type: ManagementProductEventType.FormValueChanged; patch: Partial<ProductFormValue> }
  | { type: ManagementProductEventType.SubmitClicked }
  | { type: ManagementProductEventType.CreateSucceeded; detail: ProductManagementDetailResponse }
  | { type: ManagementProductEventType.UpdateSucceeded; detail: ProductManagementDetailResponse }
  | { type: ManagementProductEventType.SaveFailed; error: string };

export enum ManagementProductGroupEventType {
  GroupsLoadStarted = 'GROUPS_LOAD_STARTED',
  GroupsLoadSucceeded = 'GROUPS_LOAD_SUCCEEDED',
  GroupsLoadFailed = 'GROUPS_LOAD_FAILED',
  ProductOptionsLoaded = 'PRODUCT_OPTIONS_LOADED',
  SearchKeywordChanged = 'SEARCH_KEYWORD_CHANGED',
  ActiveFilterChanged = 'ACTIVE_FILTER_CHANGED',
  SortChanged = 'SORT_CHANGED',
  FiltersApplied = 'FILTERS_APPLIED',
  FiltersReset = 'FILTERS_RESET',
  PageChanged = 'PAGE_CHANGED',
  CreateClicked = 'CREATE_CLICKED',
  EditClicked = 'EDIT_CLICKED',
  DialogClosed = 'DIALOG_CLOSED',
  DraftChanged = 'DRAFT_CHANGED',
  ProductSelectionToggled = 'PRODUCT_SELECTION_TOGGLED',
  SubmitClicked = 'SUBMIT_CLICKED',
  ValidationFailed = 'VALIDATION_FAILED',
  CreateSucceeded = 'CREATE_SUCCEEDED',
  UpdateSucceeded = 'UPDATE_SUCCEEDED',
  SaveFailed = 'SAVE_FAILED',
  GroupDeleted = 'GROUP_DELETED',
  DeleteFailed = 'DELETE_FAILED',
  MessagesCleared = 'MESSAGES_CLEARED',
}

export type ManagementProductGroupEvent =
  | { type: ManagementProductGroupEventType.GroupsLoadStarted }
  | { type: ManagementProductGroupEventType.GroupsLoadSucceeded; page: ManagementProductGroupPage }
  | { type: ManagementProductGroupEventType.GroupsLoadFailed }
  | {
      type: ManagementProductGroupEventType.ProductOptionsLoaded;
      productOptions: ManagementProductOption[];
    }
  | { type: ManagementProductGroupEventType.SearchKeywordChanged; keyword: string }
  | {
      type: ManagementProductGroupEventType.ActiveFilterChanged;
      activeFilter: ManagementProductGroupQuery['activeFilter'];
    }
  | { type: ManagementProductGroupEventType.SortChanged; sort: ManagementProductGroupQuery['sort'] }
  | { type: ManagementProductGroupEventType.FiltersApplied }
  | { type: ManagementProductGroupEventType.FiltersReset; query: ManagementProductGroupQuery }
  | { type: ManagementProductGroupEventType.PageChanged; page: number }
  | { type: ManagementProductGroupEventType.CreateClicked }
  | { type: ManagementProductGroupEventType.EditClicked; group: ManagementProductGroup }
  | { type: ManagementProductGroupEventType.DialogClosed }
  | { type: ManagementProductGroupEventType.DraftChanged; patch: Partial<ManagementProductGroupDraft> }
  | { type: ManagementProductGroupEventType.ProductSelectionToggled; productId: string }
  | { type: ManagementProductGroupEventType.SubmitClicked }
  | { type: ManagementProductGroupEventType.ValidationFailed; errors: ManagementProductGroupFormErrors }
  | { type: ManagementProductGroupEventType.CreateSucceeded; group: ManagementProductGroup }
  | { type: ManagementProductGroupEventType.UpdateSucceeded; group: ManagementProductGroup }
  | { type: ManagementProductGroupEventType.SaveFailed }
  | { type: ManagementProductGroupEventType.GroupDeleted; groupId: string }
  | { type: ManagementProductGroupEventType.DeleteFailed }
  | { type: ManagementProductGroupEventType.MessagesCleared };
