import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import {
  OwnerEmployee,
  OwnerEmployeeCreateDraft,
  OwnerEmployeeFormErrors,
  OwnerEmployeeQuery,
  OwnerEmployeeRole,
  OwnerEmployeeSort,
} from '../models/owner-employee.models';
import { OwnerEmployeeEvent, OwnerEmployeeEventType } from '../models/owner-employee.event';
import { OwnerEmployeeService } from '../services/owner-employee.service';

const DEFAULT_QUERY: OwnerEmployeeQuery = {
  page: 0,
  size: 10,
  sort: 'createdAt,desc',
  keyword: '',
  active: null,
  role: null,
};

const EMPTY_CREATE_DRAFT: OwnerEmployeeCreateDraft = {
  fullName: '',
  email: '',
  role: '',
};

const EMPLOYEE_ENTITY_CONFIG = {
  collection: 'employee',
  selectId: (employee: OwnerEmployee) => employee.employeeId,
} as const;

interface OwnerEmployeesUiState {
  query: OwnerEmployeeQuery;
  totalElements: number;
  totalPages: number;
  last: boolean;
  loading: boolean;
  creating: boolean;
  createModalOpen: boolean;
  createDraft: OwnerEmployeeCreateDraft;
  createErrors: OwnerEmployeeFormErrors;
  selectedEmployee: OwnerEmployee | null;
  detailModalOpen: boolean;
  errorMessage: string | null;
  successMessage: string | null;
}

const INITIAL_STATE: OwnerEmployeesUiState = {
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

export const OwnerEmployeesStore = signalStore(
  withState<OwnerEmployeesUiState>(INITIAL_STATE),
  withEntities<OwnerEmployee, 'employee'>({
    entity: {} as OwnerEmployee,
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
  withMethods((store, ownerEmployeeService = inject(OwnerEmployeeService)) => {
    const applyEmployeesPage = (page: {
      employees: OwnerEmployee[];
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

    const handleEvent = (event: OwnerEmployeeEvent): void => {
      switch (event.type) {
        case OwnerEmployeeEventType.EmployeesLoadStarted:
          patchState(store, { loading: true, errorMessage: null });
          break;

        case OwnerEmployeeEventType.EmployeesLoadSucceeded:
          applyEmployeesPage(event.page);
          break;

        case OwnerEmployeeEventType.EmployeesLoadFailed:
          patchState(
            store,
            removeAllEntities(EMPLOYEE_ENTITY_CONFIG),
            {
              totalElements: 0,
              totalPages: 0,
              last: true,
              loading: false,
              errorMessage: 'Khong the tai danh sach nhan vien. Vui long thu lai.',
            }
          );
          break;

        case OwnerEmployeeEventType.SearchKeywordChanged:
          patchState(store, {
            query: {
              ...store.query(),
              keyword: event.keyword,
            },
          });
          break;

        case OwnerEmployeeEventType.ActiveFilterChanged:
          patchState(store, {
            query: {
              ...store.query(),
              page: 0,
              active: event.active,
            },
          });
          break;

        case OwnerEmployeeEventType.RoleFilterChanged:
          patchState(store, {
            query: {
              ...store.query(),
              page: 0,
              role: event.role,
            },
          });
          break;

        case OwnerEmployeeEventType.SortChanged:
          patchState(store, {
            query: {
              ...store.query(),
              page: 0,
              sort: event.sort,
            },
          });
          break;

        case OwnerEmployeeEventType.FiltersApplied:
          patchState(store, {
            query: {
              ...store.query(),
              page: 0,
            },
          });
          break;

        case OwnerEmployeeEventType.FiltersReset:
          patchState(store, { query: { ...event.query } });
          break;

        case OwnerEmployeeEventType.PageChanged:
          patchState(store, {
            query: {
              ...store.query(),
              page: event.page,
            },
          });
          break;

        case OwnerEmployeeEventType.CreateClicked:
          patchState(store, {
            createModalOpen: true,
            createDraft: { ...event.draft },
            createErrors: {},
          });
          break;

        case OwnerEmployeeEventType.CreateCancelled:
          patchState(store, {
            createModalOpen: false,
            createDraft: { ...event.draft },
            createErrors: {},
          });
          break;

        case OwnerEmployeeEventType.CreateDraftChanged:
          patchState(store, {
            createDraft: {
              ...store.createDraft(),
              ...event.patch,
            },
            createErrors: {},
          });
          break;

        case OwnerEmployeeEventType.CreateValidationFailed:
          patchState(store, { createErrors: event.errors });
          break;

        case OwnerEmployeeEventType.CreateStarted:
          patchState(store, {
            creating: true,
            createErrors: {},
            errorMessage: null,
            successMessage: null,
          });
          break;

        case OwnerEmployeeEventType.CreateSucceeded:
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
            successMessage: 'Da tao nhan vien moi va gui email thiet lap mat khau.',
          });
          break;

        case OwnerEmployeeEventType.CreateFailed:
          patchState(store, {
            creating: false,
            createErrors: {
              submit: 'Khong the tao nhan vien. Vui long kiem tra email hoac thu lai.',
            },
            errorMessage: 'Khong the tao nhan vien. Vui long thu lai.',
          });
          break;

        case OwnerEmployeeEventType.EmployeeSelected:
          patchState(store, {
            selectedEmployee: event.employee,
            detailModalOpen: true,
          });
          break;

        case OwnerEmployeeEventType.EmployeeDetailClosed:
          patchState(store, {
            selectedEmployee: null,
            detailModalOpen: false,
          });
          break;

        case OwnerEmployeeEventType.MessagesCleared:
          patchState(store, {
            errorMessage: null,
            successMessage: null,
          });
          break;
      }
    };

    const loadEmployees = rxMethod<void>(
      pipe(
        tap(() => handleEvent({ type: OwnerEmployeeEventType.EmployeesLoadStarted })),
        switchMap(() =>
          ownerEmployeeService.getEmployees(store.query()).pipe(
            tap({
              next: page =>
                handleEvent({ type: OwnerEmployeeEventType.EmployeesLoadSucceeded, page }),
              error: () => handleEvent({ type: OwnerEmployeeEventType.EmployeesLoadFailed }),
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
              type: OwnerEmployeeEventType.CreateValidationFailed,
              errors,
            });
            return EMPTY;
          }

          handleEvent({ type: OwnerEmployeeEventType.CreateStarted });

          return ownerEmployeeService.createEmployee({
            fullName: draft.fullName.trim(),
            email: draft.email.trim().toLowerCase(),
            role: draft.role,
          }).pipe(
            switchMap(() =>
              ownerEmployeeService.getEmployees({
                ...store.query(),
                page: 0,
              })
            ),
            tap({
              next: page =>
                handleEvent({
                  type: OwnerEmployeeEventType.CreateSucceeded,
                  page,
                  draft: EMPTY_CREATE_DRAFT,
                }),
              error: () => handleEvent({ type: OwnerEmployeeEventType.CreateFailed }),
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
        handleEvent({ type: OwnerEmployeeEventType.SearchKeywordChanged, keyword });
      },
      setActiveFilter(active: boolean | null): void {
        handleEvent({ type: OwnerEmployeeEventType.ActiveFilterChanged, active });
      },
      setRoleFilter(role: OwnerEmployeeRole | null): void {
        handleEvent({ type: OwnerEmployeeEventType.RoleFilterChanged, role });
      },
      setSort(sort: OwnerEmployeeSort): void {
        handleEvent({ type: OwnerEmployeeEventType.SortChanged, sort });
      },
      applyFilters(): void {
        handleEvent({ type: OwnerEmployeeEventType.FiltersApplied });
        loadEmployees();
      },
      resetFilters(): void {
        handleEvent({ type: OwnerEmployeeEventType.FiltersReset, query: DEFAULT_QUERY });
        loadEmployees();
      },
      goToPage(page: number): void {
        const normalizedPage = Math.max(0, Math.min(page, Math.max(store.totalPages() - 1, 0)));

        handleEvent({ type: OwnerEmployeeEventType.PageChanged, page: normalizedPage });
        loadEmployees();
      },
      openCreateModal(): void {
        handleEvent({
          type: OwnerEmployeeEventType.CreateClicked,
          draft: EMPTY_CREATE_DRAFT,
        });
      },
      closeCreateModal(): void {
        if (store.creating()) {
          return;
        }

        handleEvent({
          type: OwnerEmployeeEventType.CreateCancelled,
          draft: EMPTY_CREATE_DRAFT,
        });
      },
      updateCreateDraft(patch: Partial<OwnerEmployeeCreateDraft>): void {
        handleEvent({ type: OwnerEmployeeEventType.CreateDraftChanged, patch });
      },
      openEmployeeDetail(employee: OwnerEmployee): void {
        handleEvent({ type: OwnerEmployeeEventType.EmployeeSelected, employee });
      },
      closeEmployeeDetail(): void {
        handleEvent({ type: OwnerEmployeeEventType.EmployeeDetailClosed });
      },
      clearMessages(): void {
        handleEvent({ type: OwnerEmployeeEventType.MessagesCleared });
      },
    };
  })
);

function validateCreateDraft(draft: OwnerEmployeeCreateDraft): OwnerEmployeeFormErrors {
  const errors: OwnerEmployeeFormErrors = {};

  if (!draft.fullName.trim()) {
    errors.fullName = 'Vui long nhap ho ten nhan vien.';
  }

  if (!draft.email.trim()) {
    errors.email = 'Vui long nhap email nhan vien.';
  } else if (!isValidEmail(draft.email)) {
    errors.email = 'Email khong dung dinh dang.';
  }

  if (!isEmployeeRole(draft.role)) {
    errors.role = 'Vui long chon vai tro nhan vien.';
  }

  return errors;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isEmployeeRole(role: OwnerEmployeeRole | ''): role is OwnerEmployeeRole {
  return role === 'MANAGER' || role === 'EMPLOYEE';
}
