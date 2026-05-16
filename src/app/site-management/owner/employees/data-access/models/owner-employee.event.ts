import {
  OwnerEmployee,
  OwnerEmployeeCreateDraft,
  OwnerEmployeeFormErrors,
  OwnerEmployeePage,
  OwnerEmployeeQuery,
  OwnerEmployeeRole,
  OwnerEmployeeSort,
} from './owner-employee.models';

export enum OwnerEmployeeEventType {
  EmployeesLoadStarted = 'Employees Load Started',
  EmployeesLoadSucceeded = 'Employees Load Succeeded',
  EmployeesLoadFailed = 'Employees Load Failed',
  SearchKeywordChanged = 'Search Keyword Changed',
  ActiveFilterChanged = 'Active Filter Changed',
  RoleFilterChanged = 'Role Filter Changed',
  SortChanged = 'Sort Changed',
  FiltersApplied = 'Filters Applied',
  FiltersReset = 'Filters Reset',
  PageChanged = 'Page Changed',
  CreateClicked = 'Create Clicked',
  CreateCancelled = 'Create Cancelled',
  CreateDraftChanged = 'Create Draft Changed',
  CreateValidationFailed = 'Create Validation Failed',
  CreateStarted = 'Create Started',
  CreateSucceeded = 'Create Succeeded',
  CreateFailed = 'Create Failed',
  EmployeeSelected = 'Employee Selected',
  EmployeeDetailClosed = 'Employee Detail Closed',
  MessagesCleared = 'Messages Cleared',
}

export type OwnerEmployeeEvent =
  | { type: OwnerEmployeeEventType.EmployeesLoadStarted }
  | { type: OwnerEmployeeEventType.EmployeesLoadSucceeded; page: OwnerEmployeePage }
  | { type: OwnerEmployeeEventType.EmployeesLoadFailed }
  | { type: OwnerEmployeeEventType.SearchKeywordChanged; keyword: string }
  | { type: OwnerEmployeeEventType.ActiveFilterChanged; active: boolean | null }
  | { type: OwnerEmployeeEventType.RoleFilterChanged; role: OwnerEmployeeRole | null }
  | { type: OwnerEmployeeEventType.SortChanged; sort: OwnerEmployeeSort }
  | { type: OwnerEmployeeEventType.FiltersApplied }
  | { type: OwnerEmployeeEventType.FiltersReset; query: OwnerEmployeeQuery }
  | { type: OwnerEmployeeEventType.PageChanged; page: number }
  | { type: OwnerEmployeeEventType.CreateClicked; draft: OwnerEmployeeCreateDraft }
  | { type: OwnerEmployeeEventType.CreateCancelled; draft: OwnerEmployeeCreateDraft }
  | { type: OwnerEmployeeEventType.CreateDraftChanged; patch: Partial<OwnerEmployeeCreateDraft> }
  | { type: OwnerEmployeeEventType.CreateValidationFailed; errors: OwnerEmployeeFormErrors }
  | { type: OwnerEmployeeEventType.CreateStarted }
  | { type: OwnerEmployeeEventType.CreateSucceeded; page: OwnerEmployeePage; draft: OwnerEmployeeCreateDraft }
  | { type: OwnerEmployeeEventType.CreateFailed }
  | { type: OwnerEmployeeEventType.EmployeeSelected; employee: OwnerEmployee }
  | { type: OwnerEmployeeEventType.EmployeeDetailClosed }
  | { type: OwnerEmployeeEventType.MessagesCleared };
