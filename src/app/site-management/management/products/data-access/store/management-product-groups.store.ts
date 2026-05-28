import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { addEntity, removeEntity, setAllEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import {
  ManagementProductGroupEvent,
  ManagementProductGroupEventType,
} from '../models/management-product.event';
import {
  ManagementProductGroup,
  ManagementProductGroupDraft,
  ManagementProductGroupFormErrors,
  ManagementProductGroupPage,
  ManagementProductGroupQuery,
  ManagementProductOption,
} from '../models/management-product.models';
import { ManagementProductService } from '../services/management-product.service';

export type ManagementProductGroupDialogMode = 'create' | 'edit' | null;

const DEFAULT_QUERY: ManagementProductGroupQuery = {
  page: 0,
  size: 4,
  sort: 'name,asc',
  keyword: '',
  activeFilter: 'all',
};

const DEFAULT_DRAFT: ManagementProductGroupDraft = {
  name: '',
  productIds: [],
  active: true,
};

const GROUP_ENTITY_CONFIG = {
  collection: 'group',
  selectId: (group: ManagementProductGroup) => group.groupId,
} as const;

interface ManagementProductGroupsUiState {
  query: ManagementProductGroupQuery;
  totalElements: number;
  totalPages: number;
  last: boolean;
  loading: boolean;
  productOptions: ManagementProductOption[];
  dialogMode: ManagementProductGroupDialogMode;
  draft: ManagementProductGroupDraft | null;
  formErrors: ManagementProductGroupFormErrors;
  saving: boolean;
  successMessage: string | null;
  errorMessage: string | null;
}

const INITIAL_STATE: ManagementProductGroupsUiState = {
  query: DEFAULT_QUERY,
  totalElements: 0,
  totalPages: 0,
  last: true,
  loading: false,
  productOptions: [],
  dialogMode: null,
  draft: null,
  formErrors: {},
  saving: false,
  successMessage: null,
  errorMessage: null,
};

export const ManagementProductGroupsStore = signalStore(
  withState<ManagementProductGroupsUiState>(INITIAL_STATE),
  withEntities<ManagementProductGroup, 'group'>({
    entity: {} as ManagementProductGroup,
    collection: 'group',
  }),
  withComputed(({ groupEntities, query, totalElements, totalPages, dialogMode, productOptions }) => ({
    groups: computed(() => groupEntities()),
    hasGroups: computed(() => groupEntities().length > 0),
    isEmpty: computed(() => groupEntities().length === 0),
    dialogVisible: computed(() => dialogMode() !== null),
    pageStart: computed(() => (totalElements() === 0 ? 0 : query().page * query().size + 1)),
    pageEnd: computed(() => Math.min((query().page + 1) * query().size, totalElements())),
    canGoPrevious: computed(() => query().page > 0),
    canGoNext: computed(() => query().page + 1 < totalPages()),
    selectedProductOptions: computed(() => {
      const selectedIds = new Set(groupEntities().flatMap(group => group.productIds));

      return productOptions().filter(option => selectedIds.has(option.productId));
    }),
    activeFilterCount: computed(() => {
      let count = 0;

      if (query().keyword.trim()) {
        count += 1;
      }

      if (query().activeFilter !== 'all') {
        count += 1;
      }

      return count;
    }),
  })),
  withMethods((store, productService = inject(ManagementProductService)) => {
    const applyGroupsPage = (page: ManagementProductGroupPage): void => {
      patchState(
        store,
        setAllEntities(page.groups, GROUP_ENTITY_CONFIG),
        {
          query: {
            ...store.query(),
            page: page.page,
            size: page.size,
          },
          totalElements: page.totalElements,
          totalPages: page.totalPages,
          last: page.last,
          loading: false,
          errorMessage: null,
        }
      );
    };

    const handleEvent = (event: ManagementProductGroupEvent): void => {
      switch (event.type) {
        case ManagementProductGroupEventType.GroupsLoadStarted:
          patchState(store, { loading: true, errorMessage: null });
          break;

        case ManagementProductGroupEventType.GroupsLoadSucceeded:
          applyGroupsPage(event.page);
          break;

        case ManagementProductGroupEventType.GroupsLoadFailed:
          patchState(store, {
            loading: false,
            totalElements: 0,
            totalPages: 0,
            last: true,
            errorMessage: 'Không thể tải danh sách nhóm sản phẩm. Vui lòng thử lại.',
          });
          break;

        case ManagementProductGroupEventType.ProductOptionsLoaded:
          patchState(store, { productOptions: event.productOptions });
          break;

        case ManagementProductGroupEventType.SearchKeywordChanged:
          patchState(store, {
            query: {
              ...store.query(),
              keyword: event.keyword,
              page: 0,
            },
          });
          break;

        case ManagementProductGroupEventType.ActiveFilterChanged:
          patchState(store, {
            query: {
              ...store.query(),
              activeFilter: event.activeFilter,
              page: 0,
            },
          });
          break;

        case ManagementProductGroupEventType.SortChanged:
          patchState(store, {
            query: {
              ...store.query(),
              sort: event.sort,
              page: 0,
            },
          });
          break;

        case ManagementProductGroupEventType.FiltersApplied:
          patchState(store, { query: { ...store.query(), page: 0 } });
          break;

        case ManagementProductGroupEventType.FiltersReset:
          patchState(store, { query: { ...event.query } });
          break;

        case ManagementProductGroupEventType.PageChanged:
          patchState(store, {
            query: {
              ...store.query(),
              page: Math.max(0, Math.min(event.page, Math.max(store.totalPages() - 1, 0))),
            },
          });
          break;

        case ManagementProductGroupEventType.CreateClicked:
          patchState(store, {
            dialogMode: 'create',
            draft: { ...DEFAULT_DRAFT },
            formErrors: {},
            errorMessage: null,
          });
          break;

        case ManagementProductGroupEventType.EditClicked:
          patchState(store, {
            dialogMode: 'edit',
            draft: {
              groupId: event.group.groupId,
              name: event.group.name,
              productIds: [...event.group.productIds],
              active: event.group.active,
            },
            formErrors: {},
            errorMessage: null,
          });
          break;

        case ManagementProductGroupEventType.DialogClosed:
          patchState(store, {
            dialogMode: null,
            draft: null,
            formErrors: {},
            saving: false,
          });
          break;

        case ManagementProductGroupEventType.DraftChanged: {
          const currentDraft = store.draft();

          patchState(store, {
            draft: currentDraft
              ? {
                  ...currentDraft,
                  ...event.patch,
                }
              : null,
            formErrors: {},
          });
          break;
        }

        case ManagementProductGroupEventType.ProductSelectionToggled: {
          const currentDraft = store.draft();

          if (!currentDraft) {
            break;
          }

          const selectedIds = new Set(currentDraft.productIds);

          if (selectedIds.has(event.productId)) {
            selectedIds.delete(event.productId);
          } else {
            selectedIds.add(event.productId);
          }

          patchState(store, {
            draft: {
              ...currentDraft,
              productIds: [...selectedIds],
            },
            formErrors: {},
          });
          break;
        }

        case ManagementProductGroupEventType.SubmitClicked:
          patchState(store, { saving: true, formErrors: {}, errorMessage: null });
          break;

        case ManagementProductGroupEventType.ValidationFailed:
          patchState(store, { saving: false, formErrors: event.errors });
          break;

        case ManagementProductGroupEventType.CreateSucceeded:
          patchState(
            store,
            addEntity(event.group, GROUP_ENTITY_CONFIG),
            {
              totalElements: store.totalElements() + 1,
              saving: false,
              dialogMode: null,
              draft: null,
              formErrors: {},
              successMessage: 'Đã tạo nhóm sản phẩm mock.',
            }
          );
          break;

        case ManagementProductGroupEventType.UpdateSucceeded:
          patchState(
            store,
            updateEntity(
              {
                id: event.group.groupId,
                changes: event.group,
              },
              GROUP_ENTITY_CONFIG
            ),
            {
              saving: false,
              dialogMode: null,
              draft: null,
              formErrors: {},
              successMessage: 'Đã lưu thay đổi nhóm sản phẩm.',
            }
          );
          break;

        case ManagementProductGroupEventType.SaveFailed:
          patchState(store, {
            saving: false,
            formErrors: { submit: 'Không thể lưu nhóm sản phẩm lúc này.' },
            errorMessage: 'Không thể lưu nhóm sản phẩm lúc này.',
          });
          break;

        case ManagementProductGroupEventType.GroupDeleted:
          patchState(
            store,
            removeEntity(event.groupId, GROUP_ENTITY_CONFIG),
            {
              totalElements: Math.max(0, store.totalElements() - 1),
              successMessage: 'Đã xóa nhóm sản phẩm mock.',
            }
          );
          break;

        case ManagementProductGroupEventType.DeleteFailed:
          patchState(store, { errorMessage: 'Không thể xóa nhóm sản phẩm lúc này.' });
          break;

        case ManagementProductGroupEventType.MessagesCleared:
          patchState(store, { successMessage: null, errorMessage: null });
          break;
      }
    };

    const loadGroups = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: ManagementProductGroupEventType.GroupsLoadStarted })),
        switchMap(() =>
          productService.getProductGroups(store.query()).pipe(
            tap({
              next: page =>
                handleEvent({ type: ManagementProductGroupEventType.GroupsLoadSucceeded, page }),
              error: () => handleEvent({ type: ManagementProductGroupEventType.GroupsLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const loadProductOptions = rxMethod<void>(
      pipe(
        switchMap(() =>
          productService.getProductOptions().pipe(
            tap(productOptions =>
              handleEvent({
                type: ManagementProductGroupEventType.ProductOptionsLoaded,
                productOptions,
              })
            ),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const saveDraft = rxMethod<void>(
      pipe(
        switchMap(() => {
          const draft = store.draft();

          if (!draft) {
            return EMPTY;
          }

          const errors = validateDraft(draft);

          if (Object.keys(errors).length > 0) {
            handleEvent({ type: ManagementProductGroupEventType.ValidationFailed, errors });
            return EMPTY;
          }

          handleEvent({ type: ManagementProductGroupEventType.SubmitClicked });

          const saveRequest =
            store.dialogMode() === 'edit'
              ? productService.updateProductGroup(draft)
              : productService.createProductGroup(draft);

          return saveRequest.pipe(
            tap({
              next: group =>
                handleEvent({
                  type:
                    store.dialogMode() === 'edit'
                      ? ManagementProductGroupEventType.UpdateSucceeded
                      : ManagementProductGroupEventType.CreateSucceeded,
                  group,
                }),
              error: () => handleEvent({ type: ManagementProductGroupEventType.SaveFailed }),
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    const deleteGroup = rxMethod<string>(
      pipe(
        switchMap(groupId =>
          productService.deleteProductGroup(groupId).pipe(
            tap({
              next: deletedGroupId =>
                handleEvent({
                  type: ManagementProductGroupEventType.GroupDeleted,
                  groupId: deletedGroupId,
                }),
              error: () => handleEvent({ type: ManagementProductGroupEventType.DeleteFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    return {
      dispatch: handleEvent,
      loadGroups,
      loadProductOptions,
      saveDraft,
      deleteGroup,
      setKeyword(keyword: string): void {
        handleEvent({ type: ManagementProductGroupEventType.SearchKeywordChanged, keyword });
      },
      setActiveFilter(activeFilter: ManagementProductGroupQuery['activeFilter']): void {
        handleEvent({ type: ManagementProductGroupEventType.ActiveFilterChanged, activeFilter });
      },
      setSort(sort: ManagementProductGroupQuery['sort']): void {
        handleEvent({ type: ManagementProductGroupEventType.SortChanged, sort });
      },
      applyFilters(): void {
        handleEvent({ type: ManagementProductGroupEventType.FiltersApplied });
        loadGroups();
      },
      resetFilters(): void {
        handleEvent({ type: ManagementProductGroupEventType.FiltersReset, query: DEFAULT_QUERY });
        loadGroups();
      },
      goToPage(page: number): void {
        handleEvent({ type: ManagementProductGroupEventType.PageChanged, page });
        loadGroups();
      },
      openCreateDialog(): void {
        handleEvent({ type: ManagementProductGroupEventType.CreateClicked });
        loadProductOptions();
      },
      openEditDialog(group: ManagementProductGroup): void {
        handleEvent({ type: ManagementProductGroupEventType.EditClicked, group });
        loadProductOptions();
      },
      updateDraft(patch: Partial<ManagementProductGroupDraft>): void {
        handleEvent({ type: ManagementProductGroupEventType.DraftChanged, patch });
      },
      toggleProduct(productId: string): void {
        handleEvent({ type: ManagementProductGroupEventType.ProductSelectionToggled, productId });
      },
      closeDialog(): void {
        handleEvent({ type: ManagementProductGroupEventType.DialogClosed });
      },
      clearMessages(): void {
        handleEvent({ type: ManagementProductGroupEventType.MessagesCleared });
      },
    };
  })
);

function validateDraft(draft: ManagementProductGroupDraft): ManagementProductGroupFormErrors {
  const errors: ManagementProductGroupFormErrors = {};

  if (!draft.name.trim()) {
    errors.name = 'Vui lòng nhập tên nhóm.';
  }

  if (draft.productIds.length === 0) {
    errors.productIds = 'Chọn ít nhất một sản phẩm cho nhóm.';
  }

  return errors;
}
