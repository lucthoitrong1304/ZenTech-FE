import {
  InventorySummary,
  InventoryTransaction,
  InventoryQuery,
  InventoryStats,
  PageResponse,
} from './inventory.model';

export enum InventoryEventType {
  InventoryLoadStarted = 'INVENTORY_LOAD_STARTED',
  InventoryLoadSucceeded = 'INVENTORY_LOAD_SUCCEEDED',
  InventoryLoadFailed = 'INVENTORY_LOAD_FAILED',
  TransactionsLoadStarted = 'TRANSACTIONS_LOAD_STARTED',
  TransactionsLoadSucceeded = 'TRANSACTIONS_LOAD_SUCCEEDED',
  TransactionsLoadFailed = 'TRANSACTIONS_LOAD_FAILED',
  StatsLoadSucceeded = 'STATS_LOAD_SUCCEEDED',
  SearchKeywordChanged = 'SEARCH_KEYWORD_CHANGED',
  StockFilterChanged = 'STOCK_FILTER_CHANGED',
  TypeFilterChanged = 'TYPE_FILTER_CHANGED',
  SortChanged = 'SORT_CHANGED',
  PageChanged = 'PAGE_CHANGED',
  TabChanged = 'TAB_CHANGED',
  AdjustClicked = 'ADJUST_CLICKED',
  DialogClosed = 'DIALOG_CLOSED',
  SubmitClicked = 'SUBMIT_CLICKED',
  AdjustSucceeded = 'ADJUST_SUCCEEDED',
  AdjustFailed = 'ADJUST_FAILED',
  MessagesCleared = 'MESSAGES_CLEARED',
  AiRecommendLoadStarted = 'AI_RECOMMEND_LOAD_STARTED',
  AiRecommendLoadSucceeded = 'AI_RECOMMEND_LOAD_SUCCEEDED',
  AiRecommendLoadFailed = 'AI_RECOMMEND_LOAD_FAILED',
  AiRecommendClosed = 'AI_RECOMMEND_CLOSED',
}

export type InventoryEvent =
  | { type: InventoryEventType.InventoryLoadStarted }
  | { type: InventoryEventType.InventoryLoadSucceeded; page: PageResponse<InventorySummary> }
  | { type: InventoryEventType.InventoryLoadFailed }
  | { type: InventoryEventType.TransactionsLoadStarted }
  | { type: InventoryEventType.TransactionsLoadSucceeded; page: PageResponse<InventoryTransaction> }
  | { type: InventoryEventType.TransactionsLoadFailed }
  | { type: InventoryEventType.StatsLoadSucceeded; stats: InventoryStats }
  | { type: InventoryEventType.SearchKeywordChanged; keyword: string }
  | { type: InventoryEventType.StockFilterChanged; stockStatus: InventoryQuery['stockStatus'] }
  | { type: InventoryEventType.TypeFilterChanged; txType: InventoryQuery['type'] }
  | { type: InventoryEventType.SortChanged; sort: InventoryQuery['sort'] }
  | { type: InventoryEventType.PageChanged; page: number }
  | { type: InventoryEventType.TabChanged; tab: 'stock' | 'logs' | 'faulty' }
  | { type: InventoryEventType.AdjustClicked; item: InventorySummary }
  | { type: InventoryEventType.DialogClosed }
  | { type: InventoryEventType.SubmitClicked }
  | { type: InventoryEventType.AdjustSucceeded; message: string }
  | { type: InventoryEventType.AdjustFailed; error: string }
  | { type: InventoryEventType.MessagesCleared }
  | { type: InventoryEventType.AiRecommendLoadStarted }
  | { type: InventoryEventType.AiRecommendLoadSucceeded; content: string }
  | { type: InventoryEventType.AiRecommendLoadFailed }
  | { type: InventoryEventType.AiRecommendClosed };
