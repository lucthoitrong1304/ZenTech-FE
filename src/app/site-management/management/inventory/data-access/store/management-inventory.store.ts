import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, forkJoin, map, pipe, switchMap, tap } from 'rxjs';
import {
  InventorySummary,
  InventoryTransaction,
  InventoryAdjustmentRequest,
  InventoryQuery,
  InventoryStats,
  StockStatusOption,
  TransactionTypeFilterOption,
  PageResponse,
  InventoryTransactionStats,
} from '../models/inventory.model';
import { InventoryEvent, InventoryEventType } from '../models/inventory.event';
import { ManagementInventoryService } from '../services/management-inventory.service';
import { ManagementEmployee } from '../../../employees/data-access/models/management-employee.models';
import { ManagementEmployeeService } from '../../../employees/data-access/services/management-employee.service';

const DEFAULT_STOCK_QUERY: InventoryQuery = {
  page: 0,
  size: 8,
  sort: 'productName,asc',
  keyword: '',
  stockStatus: StockStatusOption.ALL,
  type: TransactionTypeFilterOption.ALL,
};

const DEFAULT_LOGS_QUERY: InventoryQuery = {
  page: 0,
  size: 8,
  sort: 'createdAt,desc',
  keyword: '',
  stockStatus: StockStatusOption.ALL,
  type: TransactionTypeFilterOption.ALL,
  employeeId: undefined,
  reason: undefined,
  startDate: undefined,
  endDate: undefined,
};

const STOCK_ENTITY_CONFIG = {
  collection: 'stock',
  selectId: (item: InventorySummary) => item.variantId,
} as const;

interface ManagementInventoryUiState {
  activeTab: 'stock' | 'logs' | 'faulty';
  stockQuery: InventoryQuery;
  logsQuery: InventoryQuery;
  totalStockElements: number;
  totalStockPages: number;
  lastStock: boolean;
  loadingStock: boolean;
  logs: InventoryTransaction[];
  totalLogsElements: number;
  totalLogsPages: number;
  lastLogs: boolean;
  loadingLogs: boolean;
  stats: InventoryStats;
  logsStats: InventoryTransactionStats;
  activeStaffList: ManagementEmployee[];
  successMessage: string | null;
  errorMessage: string | null;
  dialogVisible: boolean;
  selectedItem: InventorySummary | null;
  saving: boolean;
  aiRecommendationText: string | null;
  loadingAiRecommend: boolean;
  aiDialogVisible: boolean;
}

const INITIAL_STATE: ManagementInventoryUiState = {
  activeTab: 'stock',
  stockQuery: DEFAULT_STOCK_QUERY,
  logsQuery: DEFAULT_LOGS_QUERY,
  totalStockElements: 0,
  totalStockPages: 0,
  lastStock: true,
  loadingStock: false,
  logs: [],
  totalLogsElements: 0,
  totalLogsPages: 0,
  lastLogs: true,
  loadingLogs: false,
  stats: {
    totalItems: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalFaultyVariants: 0,
    totalFaultyQuantity: 0,
    highFaultyAlertCount: 0,
  },
  logsStats: {
    totalImports: 0,
    totalExports: 0,
    totalCount: 0,
  },
  activeStaffList: [],
  successMessage: null,
  errorMessage: null,
  dialogVisible: false,
  selectedItem: null,
  saving: false,
  aiRecommendationText: null,
  loadingAiRecommend: false,
  aiDialogVisible: false,
};

export const ManagementInventoryStore = signalStore(
  withState<ManagementInventoryUiState>(INITIAL_STATE),
  withEntities<InventorySummary, 'stock'>({
    entity: {} as InventorySummary,
    collection: 'stock',
  }),
  withComputed(({ stockEntities, activeTab, stockQuery, logsQuery, totalStockElements, totalStockPages, totalLogsElements, totalLogsPages }) => ({
    stockItems: computed(() => stockEntities()),
    hasStockItems: computed(() => stockEntities().length > 0),
    isStockEmpty: computed(() => stockEntities().length === 0),
    
    // Derived values for pagination on active tab
    currentPage: computed(() => (activeTab() === 'logs' ? logsQuery().page : stockQuery().page)),
    pageSize: computed(() => (activeTab() === 'logs' ? logsQuery().size : stockQuery().size)),
    totalElements: computed(() => (activeTab() === 'logs' ? totalLogsElements() : totalStockElements())),
    totalPages: computed(() => (activeTab() === 'logs' ? totalLogsPages() : totalStockPages())),
    
    pageStart: computed(() => {
      const activeQuery = activeTab() === 'logs' ? logsQuery() : stockQuery();
      const total = activeTab() === 'logs' ? totalLogsElements() : totalStockElements();
      return total === 0 ? 0 : activeQuery.page * activeQuery.size + 1;
    }),
    pageEnd: computed(() => {
      const activeQuery = activeTab() === 'logs' ? logsQuery() : stockQuery();
      const total = activeTab() === 'logs' ? totalLogsElements() : totalStockElements();
      return Math.min((activeQuery.page + 1) * activeQuery.size, total);
    }),
    canGoPrevious: computed(() => {
      const activeQuery = activeTab() === 'logs' ? logsQuery() : stockQuery();
      return activeQuery.page > 0;
    }),
    canGoNext: computed(() => {
      const activeQuery = activeTab() === 'logs' ? logsQuery() : stockQuery();
      const totalPagesVal = activeTab() === 'logs' ? totalLogsPages() : totalStockPages();
      return activeQuery.page + 1 < totalPagesVal;
    }),
    activeFilterCount: computed(() => {
      let count = 0;
      if (activeTab() !== 'logs') {
        if (stockQuery().keyword.trim()) count++;
        if (stockQuery().stockStatus !== StockStatusOption.ALL) count++;
      } else {
        if (logsQuery().keyword.trim()) count++;
        if (logsQuery().type !== TransactionTypeFilterOption.ALL) count++;
        if (logsQuery().employeeId) count++;
        if (logsQuery().reason && logsQuery().reason !== 'all') count++;
        if (logsQuery().startDate) count++;
      }
      return count;
    }),
  })),
  withMethods((
    store,
    inventoryService = inject(ManagementInventoryService),
    employeeService = inject(ManagementEmployeeService)
  ) => {
    const handleEvent = (event: InventoryEvent): void => {
      switch (event.type) {
        case InventoryEventType.InventoryLoadStarted:
          patchState(store, { loadingStock: true, errorMessage: null });
          break;

        case InventoryEventType.InventoryLoadSucceeded:
          patchState(
            store,
            setAllEntities(event.page.content, STOCK_ENTITY_CONFIG),
            {
              totalStockElements: event.page.totalElements,
              totalStockPages: event.page.totalPages,
              lastStock: event.page.last,
              loadingStock: false,
              errorMessage: null,
            }
          );
          break;

        case InventoryEventType.InventoryLoadFailed:
          patchState(store, {
            loadingStock: false,
            errorMessage: 'Không thể tải dữ liệu tồn kho.',
          });
          break;

        case InventoryEventType.TransactionsLoadStarted:
          patchState(store, { loadingLogs: true, errorMessage: null });
          break;

        case InventoryEventType.TransactionsLoadSucceeded:
          patchState(store, {
            logs: event.page.content,
            totalLogsElements: event.page.totalElements,
            totalLogsPages: event.page.totalPages,
            lastLogs: event.page.last,
            loadingLogs: false,
            errorMessage: null,
          });
          break;

        case InventoryEventType.TransactionsLoadFailed:
          patchState(store, {
            loadingLogs: false,
            errorMessage: 'Không thể tải nhật ký nhập/xuất.',
          });
          break;

        case InventoryEventType.StatsLoadSucceeded:
          patchState(store, { stats: event.stats });
          break;

        case InventoryEventType.SearchKeywordChanged:
          if (store.activeTab() !== 'logs') {
            patchState(store, {
              stockQuery: { ...store.stockQuery(), keyword: event.keyword, page: 0 },
            });
          } else {
            patchState(store, {
              logsQuery: { ...store.logsQuery(), keyword: event.keyword, page: 0 },
            });
          }
          break;

        case InventoryEventType.StockFilterChanged:
          patchState(store, {
            stockQuery: { ...store.stockQuery(), stockStatus: event.stockStatus, page: 0 },
          });
          break;

        case InventoryEventType.TypeFilterChanged:
          patchState(store, {
            logsQuery: { ...store.logsQuery(), type: event.txType ?? TransactionTypeFilterOption.ALL, page: 0 },
          });
          break;

        case InventoryEventType.SortChanged:
          if (store.activeTab() !== 'logs') {
            patchState(store, {
              stockQuery: { ...store.stockQuery(), sort: event.sort, page: 0 },
            });
          } else {
            patchState(store, {
              logsQuery: { ...store.logsQuery(), sort: event.sort, page: 0 },
            });
          }
          break;

        case InventoryEventType.PageChanged:
          if (store.activeTab() !== 'logs') {
            patchState(store, {
              stockQuery: { ...store.stockQuery(), page: Math.max(0, Math.min(event.page, store.totalStockPages() - 1)) },
            });
          } else {
            patchState(store, {
              logsQuery: { ...store.logsQuery(), page: Math.max(0, Math.min(event.page, store.totalLogsPages() - 1)) },
            });
          }
          break;

        case InventoryEventType.TabChanged:
          patchState(store, { activeTab: event.tab });
          break;

        case InventoryEventType.AdjustClicked:
          patchState(store, {
            dialogVisible: true,
            selectedItem: event.item,
            errorMessage: null,
          });
          break;

        case InventoryEventType.DialogClosed:
          patchState(store, {
            dialogVisible: false,
            selectedItem: null,
          });
          break;

        case InventoryEventType.SubmitClicked:
          patchState(store, { saving: true, errorMessage: null });
          break;

        case InventoryEventType.AdjustSucceeded:
          patchState(store, {
            saving: false,
            dialogVisible: false,
            selectedItem: null,
            successMessage: event.message,
          });
          break;

        case InventoryEventType.AdjustFailed:
          patchState(store, {
            saving: false,
            errorMessage: event.error,
          });
          break;

        case InventoryEventType.MessagesCleared:
          patchState(store, { successMessage: null, errorMessage: null });
          break;

        case InventoryEventType.AiRecommendLoadStarted:
          patchState(store, {
            loadingAiRecommend: true,
            aiDialogVisible: true,
            aiRecommendationText: null,
            errorMessage: null,
          });
          break;

        case InventoryEventType.AiRecommendLoadSucceeded:
          patchState(store, {
            loadingAiRecommend: false,
            aiRecommendationText: event.content,
            errorMessage: null,
          });
          break;

        case InventoryEventType.AiRecommendLoadFailed:
          patchState(store, {
            loadingAiRecommend: false,
            aiRecommendationText: '### 🚨 Lỗi tải dữ liệu\n\nKhông thể tải báo cáo giám sát từ hệ thống AI. Vui lòng kiểm tra lại dịch vụ AI.',
            errorMessage: 'Không thể tải báo cáo giám sát AI.',
          });
          break;

        case InventoryEventType.AiRecommendClosed:
          patchState(store, {
            aiDialogVisible: false,
          });
          break;
      }
    };

    const loadInventory = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: InventoryEventType.InventoryLoadStarted })),
        switchMap(() =>
          forkJoin({
            page: inventoryService.getInventorySummary(store.stockQuery()),
            stats: inventoryService.getInventoryStats(),
          }).pipe(
            tap({
              next: ({ page, stats }) => {
                handleEvent({ type: InventoryEventType.StatsLoadSucceeded, stats });
                handleEvent({ type: InventoryEventType.InventoryLoadSucceeded, page });
              },
              error: () => handleEvent({ type: InventoryEventType.InventoryLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadLogs = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: InventoryEventType.TransactionsLoadStarted })),
        switchMap(() =>
          forkJoin({
            page: inventoryService.getTransactionLogs(store.logsQuery()),
            stats: inventoryService.getTransactionStats(store.logsQuery()),
          }).pipe(
            tap({
              next: ({ page, stats }) => {
                handleEvent({ type: InventoryEventType.TransactionsLoadSucceeded, page });
                patchState(store, { logsStats: stats });
              },
              error: () => handleEvent({ type: InventoryEventType.TransactionsLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadActiveStaff = rxMethod<void>(
      pipe(
        switchMap(() =>
          employeeService
            .getEmployees({
              page: 0,
              size: 100,
              sort: 'fullName,asc',
              keyword: '',
              active: true,
              role: null,
            })
            .pipe(
              tap({
                next: (res) => {
                  patchState(store, { activeStaffList: res.employees });
                },
                error: (err) => {
                  console.error('Không thể tải danh sách nhân viên: ', err);
                },
              }),
              catchError(() => EMPTY)
            )
        )
      )
    );

    const adjustStock = rxMethod<InventoryAdjustmentRequest>(
      pipe(
        tap(() => handleEvent({ type: InventoryEventType.SubmitClicked })),
        switchMap((payload) =>
          inventoryService.adjustStock(payload).pipe(
            tap({
              next: () => {
                handleEvent({
                  type: InventoryEventType.AdjustSucceeded,
                  message: `Cập nhật kho thành công cho biến thể: ${store.selectedItem()?.productName} (${store.selectedItem()?.variantName}).`,
                });
              },
              error: (err: unknown) => {
                const errorResponse = err as { message?: string };
                const errMsg = errorResponse?.message || 'Không thể điều chỉnh kho. Vui lòng thử lại.';
                handleEvent({ type: InventoryEventType.AdjustFailed, error: errMsg });
              },
            }),
            switchMap(() => {
              // Reload based on active view
              if (store.activeTab() !== 'logs') {
                return forkJoin({
                  page: inventoryService.getInventorySummary(store.stockQuery()),
                  stats: inventoryService.getInventoryStats(),
                }).pipe(
                  tap({
                    next: ({ page, stats }) => {
                      handleEvent({ type: InventoryEventType.StatsLoadSucceeded, stats });
                      handleEvent({ type: InventoryEventType.InventoryLoadSucceeded, page });
                    },
                  })
                );
              } else {
                return forkJoin({
                  page: inventoryService.getTransactionLogs(store.logsQuery()),
                  stats: inventoryService.getTransactionStats(store.logsQuery()),
                }).pipe(
                  tap({
                    next: ({ page, stats }) => {
                      handleEvent({ type: InventoryEventType.TransactionsLoadSucceeded, page });
                      patchState(store, { logsStats: stats });
                    },
                  })
                );
              }
            }),
            map(() => undefined),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadAiRecommendations = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: InventoryEventType.AiRecommendLoadStarted })),
        switchMap(() =>
          inventoryService.getAiRecommendations().pipe(
            tap({
              next: (res) => handleEvent({ type: InventoryEventType.AiRecommendLoadSucceeded, content: res.content }),
              error: () => handleEvent({ type: InventoryEventType.AiRecommendLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    return {
      dispatch: handleEvent,
      loadInventory,
      loadLogs,
      loadActiveStaff,
      adjustStock,
      loadAiRecommendations,
      setKeyword(keyword: string): void {
        handleEvent({ type: InventoryEventType.SearchKeywordChanged, keyword });
        if (store.activeTab() !== 'logs') {
          loadInventory();
        } else {
          loadLogs();
        }
      },
      setStockFilter(stockStatus: StockStatusOption): void {
        handleEvent({ type: InventoryEventType.StockFilterChanged, stockStatus });
        loadInventory();
      },
      setTypeFilter(txType: TransactionTypeFilterOption): void {
        handleEvent({ type: InventoryEventType.TypeFilterChanged, txType });
        loadLogs();
      },
      setEmployeeFilter(employeeId: string | null): void {
        patchState(store, {
          logsQuery: { ...store.logsQuery(), employeeId: employeeId || undefined, page: 0 },
        });
        loadLogs();
      },
      setReasonFilter(reason: string | null): void {
        patchState(store, {
          logsQuery: { ...store.logsQuery(), reason: reason || undefined, page: 0 },
        });
        loadLogs();
      },
      setDateFilter(startDate: string | null, endDate: string | null): void {
        patchState(store, {
          logsQuery: {
            ...store.logsQuery(),
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            page: 0,
          },
        });
        loadLogs();
      },
      setSort(sort: string): void {
        handleEvent({ type: InventoryEventType.SortChanged, sort });
        if (store.activeTab() !== 'logs') {
          loadInventory();
        } else {
          loadLogs();
        }
      },
      goToPage(page: number): void {
        handleEvent({ type: InventoryEventType.PageChanged, page });
        if (store.activeTab() !== 'logs') {
          loadInventory();
        } else {
          loadLogs();
        }
      },
      setTab(tab: 'stock' | 'logs' | 'faulty'): void {
        handleEvent({ type: InventoryEventType.TabChanged, tab });
        if (tab === 'stock' || tab === 'faulty') {
          loadInventory();
        } else {
          loadLogs();
        }
      },
      openAdjustDialog(item: InventorySummary): void {
        handleEvent({ type: InventoryEventType.AdjustClicked, item });
      },
      closeDialog(): void {
        handleEvent({ type: InventoryEventType.DialogClosed });
      },
      closeAiDialog(): void {
        handleEvent({ type: InventoryEventType.AiRecommendClosed });
      },
      clearMessages(): void {
        handleEvent({ type: InventoryEventType.MessagesCleared });
      },
    };
  })
);
