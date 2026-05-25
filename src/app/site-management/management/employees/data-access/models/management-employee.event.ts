import {
  ManagementEmployee,
  ManagementEmployeeCreateDraft,
  ManagementEmployeeFormErrors,
  ManagementEmployeePage,
  ManagementEmployeeQuery,
  ManagementEmployeeRole,
  ManagementEmployeeSort,
} from './management-employee.models';

export enum ManagementEmployeeEventType {
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

export type ManagementEmployeeEvent =
  | { type: ManagementEmployeeEventType.EmployeesLoadStarted }
  | { type: ManagementEmployeeEventType.EmployeesLoadSucceeded; page: ManagementEmployeePage }
  | { type: ManagementEmployeeEventType.EmployeesLoadFailed }
  | { type: ManagementEmployeeEventType.SearchKeywordChanged; keyword: string }
  | { type: ManagementEmployeeEventType.ActiveFilterChanged; active: boolean | null }
  | { type: ManagementEmployeeEventType.RoleFilterChanged; role: ManagementEmployeeRole | null }
  | { type: ManagementEmployeeEventType.SortChanged; sort: ManagementEmployeeSort }
  | { type: ManagementEmployeeEventType.FiltersApplied }
  | { type: ManagementEmployeeEventType.FiltersReset; query: ManagementEmployeeQuery }
  | { type: ManagementEmployeeEventType.PageChanged; page: number }
  | { type: ManagementEmployeeEventType.CreateClicked; draft: ManagementEmployeeCreateDraft }
  | { type: ManagementEmployeeEventType.CreateCancelled; draft: ManagementEmployeeCreateDraft }
  | { type: ManagementEmployeeEventType.CreateDraftChanged; patch: Partial<ManagementEmployeeCreateDraft> }
  | { type: ManagementEmployeeEventType.CreateValidationFailed; errors: ManagementEmployeeFormErrors }
  | { type: ManagementEmployeeEventType.CreateStarted }
  | { type: ManagementEmployeeEventType.CreateSucceeded; page: ManagementEmployeePage; draft: ManagementEmployeeCreateDraft }
  | { type: ManagementEmployeeEventType.CreateFailed }
  | { type: ManagementEmployeeEventType.EmployeeSelected; employee: ManagementEmployee }
  | { type: ManagementEmployeeEventType.EmployeeDetailClosed }
  | { type: ManagementEmployeeEventType.MessagesCleared };
