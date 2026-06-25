import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import { CategoryNavigationStore } from '../../../../shared/data-access/store/category-navigation.store';
import {
  ManagementCategoryEvent,
  ManagementCategoryEventType,
} from '../models/management-category.event';
import {
  ManagementCategory,
  ManagementCategoryDialogMode,
  ManagementCategoryDraft,
  ManagementCategoryFormErrors,
  ManagementCategoryQuery,
} from '../models/management-category.models';
import {
  ManagementCategoryService,
  buildCategoryReorderItems,
  flattenManagementCategories,
  moveCategoryWithinSiblings,
  readManagementCategoryError,
} from '../services/management-category.service';

const DEFAULT_QUERY: ManagementCategoryQuery = {
  keyword: '',
  visibility: 'all',
};

const DEFAULT_DRAFT: ManagementCategoryDraft = {
  categoryName: '',
  shortName: '',
  parentId: null,
  visible: true,
};

interface ManagementCategoriesState {
  categories: ManagementCategory[];
  query: ManagementCategoryQuery;
  loading: boolean;
  saving: boolean;
  reordering: boolean;
  dialogMode: ManagementCategoryDialogMode;
  draft: ManagementCategoryDraft | null;
  formErrors: ManagementCategoryFormErrors;
  successMessage: string | null;
  errorMessage: string | null;
}

const INITIAL_STATE: ManagementCategoriesState = {
  categories: [],
  query: DEFAULT_QUERY,
  loading: false,
  saving: false,
  reordering: false,
  dialogMode: null,
  draft: null,
  formErrors: {},
  successMessage: null,
  errorMessage: null,
};

export const ManagementCategoriesStore = signalStore(
  withState<ManagementCategoriesState>(INITIAL_STATE),
  withComputed(({ categories, query, dialogMode, draft }) => ({
    flatCategories: computed(() => flattenManagementCategories(categories())),
    visibleCategoryCount: computed(() =>
      flattenManagementCategories(categories()).filter(category => category.visible).length
    ),
    hiddenCategoryCount: computed(() =>
      flattenManagementCategories(categories()).filter(category => !category.visible).length
    ),
    rootCategoryCount: computed(() => categories().length),
    filteredCategories: computed(() => filterCategories(categories(), query())),
    activeFilterCount: computed(() => {
      let count = 0;

      if (query().keyword.trim()) {
        count += 1;
      }

      if (query().visibility !== 'all') {
        count += 1;
      }

      return count;
    }),
    dialogVisible: computed(() => dialogMode() !== null),
    parentOptions: computed(() =>
      buildParentOptions(flattenManagementCategories(categories()), draft()?.id ?? null)
    ),
  })),
  withMethods((
    store,
    categoryService = inject(ManagementCategoryService),
    categoryNavigationStore = inject(CategoryNavigationStore)
  ) => {
    const handleEvent = (event: ManagementCategoryEvent): void => {
      switch (event.type) {
        case ManagementCategoryEventType.CategoriesLoadStarted:
          patchState(store, {
            loading: event.silent ? store.loading() : true,
            errorMessage: null,
          });
          break;

        case ManagementCategoryEventType.CategoriesLoadSucceeded:
          patchState(store, {
            categories: event.categories,
            loading: false,
            errorMessage: null,
          });
          break;

        case ManagementCategoryEventType.CategoriesLoadFailed:
          patchState(store, {
            categories: [],
            loading: false,
            errorMessage: event.message ?? 'Không thể tải danh mục sản phẩm.',
          });
          break;

        case ManagementCategoryEventType.SearchKeywordChanged:
          patchState(store, { query: { ...store.query(), keyword: event.keyword } });
          break;

        case ManagementCategoryEventType.VisibilityFilterChanged:
          patchState(store, { query: { ...store.query(), visibility: event.visibility } });
          break;

        case ManagementCategoryEventType.FiltersReset:
          patchState(store, { query: { ...event.query } });
          break;

        case ManagementCategoryEventType.CreateClicked:
          patchState(store, {
            dialogMode: 'create',
            draft: { ...DEFAULT_DRAFT, parentId: event.parentId ?? null },
            formErrors: {},
            errorMessage: null,
          });
          break;

        case ManagementCategoryEventType.EditClicked:
          patchState(store, {
            dialogMode: 'edit',
            draft: {
              id: event.category.id,
              categoryName: event.category.categoryName,
              shortName: event.category.shortName ?? '',
              parentId: event.category.parentId,
              visible: event.category.visible,
            },
            formErrors: {},
            errorMessage: null,
          });
          break;

        case ManagementCategoryEventType.DialogClosed:
          patchState(store, {
            dialogMode: null,
            draft: null,
            formErrors: {},
            saving: false,
          });
          break;

        case ManagementCategoryEventType.DraftChanged: {
          const currentDraft = store.draft();

          patchState(store, {
            draft: currentDraft ? { ...currentDraft, ...event.patch } : null,
            formErrors: {},
          });
          break;
        }

        case ManagementCategoryEventType.SubmitClicked:
          patchState(store, { saving: true, formErrors: {}, errorMessage: null });
          break;

        case ManagementCategoryEventType.ValidationFailed:
          patchState(store, { saving: false, formErrors: event.errors });
          break;

        case ManagementCategoryEventType.CreateSucceeded:
          patchState(store, {
            saving: false,
            dialogMode: null,
            draft: null,
            formErrors: {},
            successMessage: `Đã tạo danh mục ${event.category.categoryName}.`,
          });
          break;

        case ManagementCategoryEventType.UpdateSucceeded:
          patchState(store, {
            saving: false,
            dialogMode: null,
            draft: null,
            formErrors: {},
            successMessage: `Đã lưu thay đổi cho ${event.category.categoryName}.`,
          });
          break;

        case ManagementCategoryEventType.SaveFailed:
          patchState(store, {
            saving: false,
            formErrors: { submit: event.message ?? 'Không thể lưu danh mục lúc này.' },
            errorMessage: event.message ?? 'Không thể lưu danh mục lúc này.',
          });
          break;

        case ManagementCategoryEventType.DeleteSucceeded:
          patchState(store, {
            successMessage: 'Đã xóa danh mục sản phẩm.',
          });
          break;

        case ManagementCategoryEventType.DeleteFailed:
          patchState(store, {
            errorMessage: event.message ?? 'Không thể xóa danh mục lúc này.',
          });
          break;

        case ManagementCategoryEventType.ReorderSucceeded:
          patchState(store, {
            categories: event.categories,
            reordering: false,
            successMessage: 'Đã cập nhật thứ tự danh mục.',
          });
          break;

        case ManagementCategoryEventType.ReorderFailed:
          patchState(store, {
            reordering: false,
            errorMessage: event.message ?? 'Không thể cập nhật thứ tự danh mục.',
          });
          break;

        case ManagementCategoryEventType.MessagesCleared:
          patchState(store, { successMessage: null, errorMessage: null });
          break;
      }
    };

    const refreshPublicNavigation = (): void => {
      categoryNavigationStore.refreshCategories();
    };

    const loadCategories = rxMethod<boolean | void>(
      pipe(
        tap(silent =>
          handleEvent({ type: ManagementCategoryEventType.CategoriesLoadStarted, silent: !!silent })
        ),
        switchMap(() =>
          categoryService.getCategories().pipe(
            tap({
              next: categories =>
                handleEvent({
                  type: ManagementCategoryEventType.CategoriesLoadSucceeded,
                  categories,
                }),
              error: error =>
                handleEvent({
                  type: ManagementCategoryEventType.CategoriesLoadFailed,
                  message: readManagementCategoryError(error, 'Không thể tải danh mục sản phẩm.'),
                }),
            }),
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

          const errors = validateDraft(draft, store.flatCategories());

          if (Object.keys(errors).length > 0) {
            handleEvent({ type: ManagementCategoryEventType.ValidationFailed, errors });
            return EMPTY;
          }

          handleEvent({ type: ManagementCategoryEventType.SubmitClicked });

          const request =
            store.dialogMode() === 'edit'
              ? categoryService.updateCategory(draft)
              : categoryService.createCategory(draft);

          return request.pipe(
            tap({
              next: category => {
                handleEvent({
                  type:
                    store.dialogMode() === 'edit'
                      ? ManagementCategoryEventType.UpdateSucceeded
                      : ManagementCategoryEventType.CreateSucceeded,
                  category,
                });
                loadCategories(true);
                refreshPublicNavigation();
              },
              error: error =>
                handleEvent({
                  type: ManagementCategoryEventType.SaveFailed,
                  message: readManagementCategoryError(error, 'Không thể lưu danh mục lúc này.'),
                }),
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    const deleteCategory = rxMethod<string>(
      pipe(
        switchMap(categoryId =>
          categoryService.deleteCategory(categoryId).pipe(
            tap({
              next: deletedCategoryId => {
                handleEvent({
                  type: ManagementCategoryEventType.DeleteSucceeded,
                  categoryId: deletedCategoryId,
                });
                loadCategories(true);
                refreshPublicNavigation();
              },
              error: error =>
                handleEvent({
                  type: ManagementCategoryEventType.DeleteFailed,
                  message: readManagementCategoryError(error, 'Không thể xóa danh mục lúc này.'),
                }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const updateVisibility = rxMethod<ManagementCategory>(
      pipe(
        switchMap(category => {
          patchState(store, { saving: true, errorMessage: null });

          return categoryService.updateCategory({
            id: category.id,
            categoryName: category.categoryName,
            shortName: category.shortName ?? '',
            parentId: category.parentId,
            visible: !category.visible,
          }).pipe(
            tap({
              next: updatedCategory => {
                handleEvent({
                  type: ManagementCategoryEventType.UpdateSucceeded,
                  category: updatedCategory,
                });
                loadCategories(true);
                refreshPublicNavigation();
              },
              error: error =>
                handleEvent({
                  type: ManagementCategoryEventType.SaveFailed,
                  message: readManagementCategoryError(error, 'Không thể cập nhật trạng thái hiển thị.'),
                }),
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    const reorderCategory = rxMethod<{ categoryId: string; direction: 'up' | 'down' }>(
      pipe(
        switchMap(({ categoryId, direction }) => {
          const nextCategories = moveCategoryWithinSiblings(store.categories(), categoryId, direction);

          if (!nextCategories) {
            return EMPTY;
          }

          patchState(store, { reordering: true, errorMessage: null });

          return categoryService.reorderCategories(buildCategoryReorderItems(nextCategories)).pipe(
            tap({
              next: categories => {
                handleEvent({ type: ManagementCategoryEventType.ReorderSucceeded, categories });
                refreshPublicNavigation();
              },
              error: error =>
                handleEvent({
                  type: ManagementCategoryEventType.ReorderFailed,
                  message: readManagementCategoryError(error, 'Không thể cập nhật thứ tự danh mục.'),
                }),
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    return {
      dispatch: handleEvent,
      loadCategories,
      saveDraft,
      deleteCategory,
      reorderCategory,
      updateVisibility,
      setKeyword(keyword: string): void {
        handleEvent({ type: ManagementCategoryEventType.SearchKeywordChanged, keyword });
      },
      setVisibilityFilter(visibility: ManagementCategoryQuery['visibility']): void {
        handleEvent({ type: ManagementCategoryEventType.VisibilityFilterChanged, visibility });
      },
      resetFilters(): void {
        handleEvent({ type: ManagementCategoryEventType.FiltersReset, query: DEFAULT_QUERY });
      },
      openCreateDialog(parentId: string | null = null): void {
        handleEvent({ type: ManagementCategoryEventType.CreateClicked, parentId });
      },
      openEditDialog(category: ManagementCategory): void {
        handleEvent({ type: ManagementCategoryEventType.EditClicked, category });
      },
      updateDraft(patch: Partial<ManagementCategoryDraft>): void {
        handleEvent({ type: ManagementCategoryEventType.DraftChanged, patch });
      },
      closeDialog(): void {
        handleEvent({ type: ManagementCategoryEventType.DialogClosed });
      },
      toggleVisible(category: ManagementCategory): void {
        updateVisibility(category);
      },
      canMove(categoryId: string, direction: 'up' | 'down'): boolean {
        return canMoveWithinSiblings(store.categories(), categoryId, direction);
      },
      clearMessages(): void {
        handleEvent({ type: ManagementCategoryEventType.MessagesCleared });
      },
    };
  })
);

export function validateDraft(
  draft: ManagementCategoryDraft,
  categories: ManagementCategory[]
): ManagementCategoryFormErrors {
  const errors: ManagementCategoryFormErrors = {};
  const categoryName = draft.categoryName.trim();
  const shortName = draft.shortName.trim();

  if (!categoryName) {
    errors.categoryName = 'Vui lòng nhập tên danh mục.';
  } else if (categoryName.length > 255) {
    errors.categoryName = 'Tên danh mục tối đa 255 ký tự.';
  }

  if (shortName.length > 255) {
    errors.shortName = 'Tên rút gọn tối đa 255 ký tự.';
  }

  if (draft.id && draft.parentId) {
    const current = categories.find(category => category.id === draft.id);
    const descendantIds = new Set(current ? flattenManagementCategories(current.children).map(child => child.id) : []);

    if (draft.parentId === draft.id || descendantIds.has(draft.parentId)) {
      errors.parentId = 'Danh mục cha không hợp lệ.';
    }
  }

  return errors;
}

function filterCategories(
  categories: ManagementCategory[],
  query: ManagementCategoryQuery
): ManagementCategory[] {
  const keyword = normalizeSearch(query.keyword);

  return categories.flatMap(category => {
    const filteredChildren = filterCategories(category.children, query);
    const matchesKeyword =
      !keyword ||
      normalizeSearch(category.categoryName).includes(keyword) ||
      normalizeSearch(category.shortName ?? '').includes(keyword);
    const matchesVisibility =
      query.visibility === 'all' ||
      (query.visibility === 'visible' && category.visible) ||
      (query.visibility === 'hidden' && !category.visible);

    if ((matchesKeyword && matchesVisibility) || filteredChildren.length > 0) {
      return [{ ...category, children: filteredChildren }];
    }

    return [];
  });
}

function buildParentOptions(
  categories: ManagementCategory[],
  editingCategoryId: string | null
): ManagementCategory[] {
  if (!editingCategoryId) {
    return categories;
  }

  const editingCategory = categories.find(category => category.id === editingCategoryId);
  const blockedIds = new Set([
    editingCategoryId,
    ...(editingCategory ? flattenManagementCategories(editingCategory.children).map(child => child.id) : []),
  ]);

  return categories.filter(category => !blockedIds.has(category.id));
}

function canMoveWithinSiblings(
  categories: ManagementCategory[],
  categoryId: string,
  direction: 'up' | 'down'
): boolean {
  const index = categories.findIndex(category => category.id === categoryId);

  if (index >= 0) {
    return direction === 'up' ? index > 0 : index < categories.length - 1;
  }

  return categories.some(category => canMoveWithinSiblings(category.children, categoryId, direction));
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}
