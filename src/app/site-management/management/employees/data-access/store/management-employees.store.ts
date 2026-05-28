import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import {
  ManagementEmployee,
  ManagementEmployeeCreateDraft,
  ManagementEmployeeFormErrors,
  ManagementEmployeeQuery,
  ManagementEmployeeRole,
  ManagementEmployeeSort,
} from '../models/management-employee.models';
import { ManagementEmployeeEvent, ManagementEmployeeEventType } from '../models/management-employee.event';
import { ManagementEmployeeService } from '../services/management-employee.service';

const DEFAULT_QUERY: ManagementEmployeeQuery = {
  page: 0,
  size: 10,
  sort: 'createdAt,desc',
  keyword: '',
  active: null,
  role: null,
};

const EMPTY_CREATE_DRAFT: ManagementEmployeeCreateDraft = {
  fullName: '',
  email: '',
  role: '',
};

const EMPLOYEE_ENTITY_CONFIG = {
  collection: 'employee',
  selectId: (employee: ManagementEmployee) => employee.employeeId,
} as const;

interface ManagementEmployeesUiState {
  query: ManagementEmployeeQuery;
  totalElements: number;
  totalPages: number;
  last: boolean;
  loading: boolean;
  creating: boolean;
  createModalOpen: boolean;
  createDraft: ManagementEmployeeCreateDraft;
  createErrors: ManagementEmployeeFormErrors;
  selectedEmployee: ManagementEmployee | null;
  detailModalOpen: boolean;
  errorMessage: string | null;
  successMessage: string | null;
}

const INITIAL_STATE: ManagementEmployeesUiState = {
  query: DEFAULT_QUERY,
  totalElements: 0,
  totalPages: 0,
  last: true,
  loading: false,
  creating: false,
  createModalOpen: false,
  createDraft: EMPTY_CREATE_DRAFT,
  createErrors: {},
  selectedEmployee: null,
  detailModalOpen: false,
  errorMessage: null,
  successMessage: null,
};

export const ManagementEmployeesStore = signalStore(
  withState<ManagementEmployeesUiState>(INITIAL_STATE),
  withEntities<ManagementEmployee, 'employee'>({
    entity: {} as ManagementEmployee,
    collection: 'employee',
  }),
  withComputed(({ employeeEntities, query, totalElements, totalPages, createDraft, creating }) => ({
    employees: computed(() => employeeEntities()),
    pageStart: computed(() => {
      const total = totalElements();

      if (total === 0) {
        return 0;
      }

      return query().page * query().size + 1;
    }),
    pageEnd: computed(() => Math.min((query().page + 1) * query().size, totalElements())),
    canGoPrevious: computed(() => query().page > 0),
    canGoNext: computed(() => query().page + 1 < totalPages()),
    hasEmployees: computed(() => employeeEntities().length > 0),
    createPayloadReady: computed(() => {
      const draft = createDraft();

      return (
        !!draft.fullName.trim() &&
        isValidEmail(draft.email) &&
        isEmployeeRole(draft.role) &&
        !creating()
      );
    }),
  })),
  withMethods((store, managementEmployeeService = inject(ManagementEmployeeService)) => {
    const applyEmployeesPage = (page: {
      employees: ManagementEmployee[];
      page: number;
      size: number;
      totalElements: number;
      totalPages: number;
      last: boolean;
    }): void => {
      patchState(
        store,
        setAllEntities(page.employees, EMPLOYEE_ENTITY_CONFIG),
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

    const handleEvent = (event: ManagementEmployeeEvent): void => {
      switch (event.type) {
        case ManagementEmployeeEventType.EmployeesLoadStarted:
          patchState(store, { loading: true, errorMessage: null });
          break;

        case ManagementEmployeeEventType.EmployeesLoadSucceeded:
          applyEmployeesPage(event.page);
          break;

        case ManagementEmployeeEventType.EmployeesLoadFailed:
          patchState(
            store,
            removeAllEntities(EMPLOYEE_ENTITY_CONFIG),
            {
              totalElements: 0,
              totalPages: 0,
              last: true,
              loading: false,
              errorMessage: 'Không thể tải danh sách nhân viên. Vui lòng thử lại.',
            }
          );
          break;

        case ManagementEmployeeEventType.SearchKeywordChanged:
          patchState(store, {
            query: {
              ...store.query(),
              keyword: event.keyword,
            },
          });
          break;

        case ManagementEmployeeEventType.ActiveFilterChanged:
          patchState(store, {
            query: {
              ...store.query(),
              page: 0,
              active: event.active,
            },
          });
          break;

        case ManagementEmployeeEventType.RoleFilterChanged:
          patchState(store, {
            query: {
              ...store.query(),
              page: 0,
              role: event.role,
            },
          });
          break;

        case ManagementEmployeeEventType.SortChanged:
          patchState(store, {
            query: {
              ...store.query(),
              page: 0,
              sort: event.sort,
            },
          });
          break;

        case ManagementEmployeeEventType.FiltersApplied:
          patchState(store, {
            query: {
              ...store.query(),
              page: 0,
            },
          });
          break;

        case ManagementEmployeeEventType.FiltersReset:
          patchState(store, { query: { ...event.query } });
          break;

        case ManagementEmployeeEventType.PageChanged:
          patchState(store, {
            query: {
              ...store.query(),
              page: event.page,
            },
          });
          break;

        case ManagementEmployeeEventType.CreateClicked:
          patchState(store, {
            createModalOpen: true,
            createDraft: { ...event.draft },
            createErrors: {},
          });
          break;

        case ManagementEmployeeEventType.CreateCancelled:
          patchState(store, {
            createModalOpen: false,
            createDraft: { ...event.draft },
            createErrors: {},
          });
          break;

        case ManagementEmployeeEventType.CreateDraftChanged:
          patchState(store, {
            createDraft: {
              ...store.createDraft(),
              ...event.patch,
            },
            createErrors: {},
          });
          break;

        case ManagementEmployeeEventType.CreateValidationFailed:
          patchState(store, { createErrors: event.errors });
          break;

        case ManagementEmployeeEventType.CreateStarted:
          patchState(store, {
            creating: true,
            createErrors: {},
            errorMessage: null,
            successMessage: null,
          });
          break;

        case ManagementEmployeeEventType.CreateSucceeded:
          applyEmployeesPage(event.page);
          patchState(store, {
            query: {
              ...store.query(),
              page: event.page.page,
              size: event.page.size,
            },
            creating: false,
            createModalOpen: false,
            createDraft: { ...event.draft },
            createErrors: {},
            successMessage: 'Đã tạo nhân viên mới và gửi email thiết lập mật khẩu.',
          });
          break;

        case ManagementEmployeeEventType.CreateFailed:
          patchState(store, {
            creating: false,
            createErrors: {
              submit: 'Không thể tạo nhân viên. Vui lòng kiểm tra email hoặc thử lại.',
            },
            errorMessage: 'Không thể tạo nhân viên. Vui lòng thử lại.',
          });
          break;

        case ManagementEmployeeEventType.EmployeeSelected:
          patchState(store, {
            selectedEmployee: event.employee,
            detailModalOpen: true,
          });
          break;

        case ManagementEmployeeEventType.EmployeeDetailClosed:
          patchState(store, {
            selectedEmployee: null,
            detailModalOpen: false,
          });
          break;

        case ManagementEmployeeEventType.MessagesCleared:
          patchState(store, {
            errorMessage: null,
            successMessage: null,
          });
          break;
      }
    };

    const loadEmployees = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: ManagementEmployeeEventType.EmployeesLoadStarted })),
        switchMap(() =>
          managementEmployeeService.getEmployees(store.query()).pipe(
            tap({
              next: page =>
                handleEvent({ type: ManagementEmployeeEventType.EmployeesLoadSucceeded, page }),
              error: () => handleEvent({ type: ManagementEmployeeEventType.EmployeesLoadFailed }),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    );

    const createEmployee = rxMethod<void>(
      pipe(
        switchMap(() => {
          const draft = store.createDraft();
          const errors = validateCreateDraft(draft);

          if (Object.keys(errors).length > 0 || !isEmployeeRole(draft.role)) {
            handleEvent({
              type: ManagementEmployeeEventType.CreateValidationFailed,
              errors,
            });
            return EMPTY;
          }

          handleEvent({ type: ManagementEmployeeEventType.CreateStarted });

          return managementEmployeeService.createEmployee({
            fullName: draft.fullName.trim(),
            email: draft.email.trim().toLowerCase(),
            role: draft.role,
          }).pipe(
            switchMap(() =>
              managementEmployeeService.getEmployees({
                ...store.query(),
                page: 0,
              })
            ),
            tap({
              next: page =>
                handleEvent({
                  type: ManagementEmployeeEventType.CreateSucceeded,
                  page,
                  draft: EMPTY_CREATE_DRAFT,
                }),
              error: () => handleEvent({ type: ManagementEmployeeEventType.CreateFailed }),
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    return {
      dispatch: handleEvent,
      loadEmployees,
      createEmployee,
      setKeyword(keyword: string): void {
        handleEvent({ type: ManagementEmployeeEventType.SearchKeywordChanged, keyword });
      },
      setActiveFilter(active: boolean | null): void {
        handleEvent({ type: ManagementEmployeeEventType.ActiveFilterChanged, active });
      },
      setRoleFilter(role: ManagementEmployeeRole | null): void {
        handleEvent({ type: ManagementEmployeeEventType.RoleFilterChanged, role });
      },
      setSort(sort: ManagementEmployeeSort): void {
        handleEvent({ type: ManagementEmployeeEventType.SortChanged, sort });
      },
      applyFilters(): void {
        handleEvent({ type: ManagementEmployeeEventType.FiltersApplied });
        loadEmployees();
      },
      resetFilters(): void {
        handleEvent({ type: ManagementEmployeeEventType.FiltersReset, query: DEFAULT_QUERY });
        loadEmployees();
      },
      goToPage(page: number): void {
        const normalizedPage = Math.max(0, Math.min(page, Math.max(store.totalPages() - 1, 0)));

        handleEvent({ type: ManagementEmployeeEventType.PageChanged, page: normalizedPage });
        loadEmployees();
      },
      openCreateModal(): void {
        handleEvent({
          type: ManagementEmployeeEventType.CreateClicked,
          draft: EMPTY_CREATE_DRAFT,
        });
      },
      closeCreateModal(): void {
        if (store.creating()) {
          return;
        }

        handleEvent({
          type: ManagementEmployeeEventType.CreateCancelled,
          draft: EMPTY_CREATE_DRAFT,
        });
      },
      updateCreateDraft(patch: Partial<ManagementEmployeeCreateDraft>): void {
        handleEvent({ type: ManagementEmployeeEventType.CreateDraftChanged, patch });
      },
      openEmployeeDetail(employee: ManagementEmployee): void {
        handleEvent({ type: ManagementEmployeeEventType.EmployeeSelected, employee });
      },
      closeEmployeeDetail(): void {
        handleEvent({ type: ManagementEmployeeEventType.EmployeeDetailClosed });
      },
      clearMessages(): void {
        handleEvent({ type: ManagementEmployeeEventType.MessagesCleared });
      },
    };
  })
);

function validateCreateDraft(draft: ManagementEmployeeCreateDraft): ManagementEmployeeFormErrors {
  const errors: ManagementEmployeeFormErrors = {};

  if (!draft.fullName.trim()) {
    errors.fullName = 'Vui lòng nhập họ tên nhân viên.';
  }

  if (!draft.email.trim()) {
    errors.email = 'Vui lòng nhập email nhân viên.';
  } else if (!isValidEmail(draft.email)) {
    errors.email = 'Email không đúng định dạng.';
  }

  if (!isEmployeeRole(draft.role)) {
    errors.role = 'Vui lòng chọn vai trò nhân viên.';
  }

  return errors;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isEmployeeRole(role: ManagementEmployeeRole | ''): role is ManagementEmployeeRole {
  return role === 'MANAGER' || role === 'EMPLOYEE';
}
