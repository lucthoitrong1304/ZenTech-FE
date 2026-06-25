import {
  ManagementCategory,
  ManagementCategoryDraft,
  ManagementCategoryFormErrors,
  ManagementCategoryQuery,
} from './management-category.models';

export enum ManagementCategoryEventType {
  CategoriesLoadStarted = 'CategoriesLoadStarted',
  CategoriesLoadSucceeded = 'CategoriesLoadSucceeded',
  CategoriesLoadFailed = 'CategoriesLoadFailed',
  SearchKeywordChanged = 'SearchKeywordChanged',
  VisibilityFilterChanged = 'VisibilityFilterChanged',
  FiltersReset = 'FiltersReset',
  CreateClicked = 'CreateClicked',
  EditClicked = 'EditClicked',
  DialogClosed = 'DialogClosed',
  DraftChanged = 'DraftChanged',
  SubmitClicked = 'SubmitClicked',
  ValidationFailed = 'ValidationFailed',
  CreateSucceeded = 'CreateSucceeded',
  UpdateSucceeded = 'UpdateSucceeded',
  SaveFailed = 'SaveFailed',
  DeleteSucceeded = 'DeleteSucceeded',
  DeleteFailed = 'DeleteFailed',
  ReorderSucceeded = 'ReorderSucceeded',
  ReorderFailed = 'ReorderFailed',
  MessagesCleared = 'MessagesCleared',
}

export type ManagementCategoryEvent =
  | { type: ManagementCategoryEventType.CategoriesLoadStarted; silent?: boolean }
  | { type: ManagementCategoryEventType.CategoriesLoadSucceeded; categories: ManagementCategory[] }
  | { type: ManagementCategoryEventType.CategoriesLoadFailed; message?: string }
  | { type: ManagementCategoryEventType.SearchKeywordChanged; keyword: string }
  | { type: ManagementCategoryEventType.VisibilityFilterChanged; visibility: ManagementCategoryQuery['visibility'] }
  | { type: ManagementCategoryEventType.FiltersReset; query: ManagementCategoryQuery }
  | { type: ManagementCategoryEventType.CreateClicked; parentId?: string | null }
  | { type: ManagementCategoryEventType.EditClicked; category: ManagementCategory }
  | { type: ManagementCategoryEventType.DialogClosed }
  | { type: ManagementCategoryEventType.DraftChanged; patch: Partial<ManagementCategoryDraft> }
  | { type: ManagementCategoryEventType.SubmitClicked }
  | { type: ManagementCategoryEventType.ValidationFailed; errors: ManagementCategoryFormErrors }
  | { type: ManagementCategoryEventType.CreateSucceeded; category: ManagementCategory }
  | { type: ManagementCategoryEventType.UpdateSucceeded; category: ManagementCategory }
  | { type: ManagementCategoryEventType.SaveFailed; message?: string }
  | { type: ManagementCategoryEventType.DeleteSucceeded; categoryId: string }
  | { type: ManagementCategoryEventType.DeleteFailed; message?: string }
  | { type: ManagementCategoryEventType.ReorderSucceeded; categories: ManagementCategory[] }
  | { type: ManagementCategoryEventType.ReorderFailed; message?: string }
  | { type: ManagementCategoryEventType.MessagesCleared };
