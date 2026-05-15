import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
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

interface OwnerEmployeesState {
  employees: OwnerEmployee[];
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

const INITIAL_STATE: OwnerEmployeesState = {
  employees: [],
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
  withState<OwnerEmployeesState>(INITIAL_STATE),
  withComputed(({ employees, query, totalElements, totalPages, createDraft, creating }) => ({
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
    hasEmployees: computed(() => employees().length > 0),
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
    const loadEmployees = rxMethod<void>(
      pipe(
        tap(() =>
          patchState(store, {
            loading: true,
            errorMessage: null,
          })
        ),
        switchMap(() =>
          ownerEmployeeService.getEmployees(store.query()).pipe(
            tap({
              next: page =>
                patchState(store, {
                  employees: page.employees,
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
                }),
              error: () =>
                patchState(store, {
                  employees: [],
                  totalElements: 0,
                  totalPages: 0,
                  last: true,
                  loading: false,
                  errorMessage: 'Khong the tai danh sach nhan vien. Vui long thu lai.',
                }),
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
            patchState(store, { createErrors: errors });
            return EMPTY;
          }

          patchState(store, {
            creating: true,
            createErrors: {},
            errorMessage: null,
            successMessage: null,
          });

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
                patchState(store, {
                  employees: page.employees,
                  query: {
                    ...store.query(),
                    page: page.page,
                    size: page.size,
                  },
                  totalElements: page.totalElements,
                  totalPages: page.totalPages,
                  last: page.last,
                  loading: false,
                  creating: false,
                  createModalOpen: false,
                  createDraft: { ...EMPTY_CREATE_DRAFT },
                  createErrors: {},
                  successMessage: 'Da tao nhan vien moi va gui email thiet lap mat khau.',
                }),
              error: () =>
                patchState(store, {
                  creating: false,
                  createErrors: {
                    submit: 'Khong the tao nhan vien. Vui long kiem tra email hoac thu lai.',
                  },
                  errorMessage: 'Khong the tao nhan vien. Vui long thu lai.',
                }),
            }),
            catchError(() => EMPTY)
          );
        })
      )
    );

    return {
      loadEmployees,
      createEmployee,
    setKeyword(keyword: string): void {
      patchState(store, {
        query: {
          ...store.query(),
          keyword,
        },
      });
    },
    setActiveFilter(active: boolean | null): void {
      patchState(store, {
        query: {
          ...store.query(),
          page: 0,
          active,
        },
      });
    },
    setRoleFilter(role: OwnerEmployeeRole | null): void {
      patchState(store, {
        query: {
          ...store.query(),
          page: 0,
          role,
        },
      });
    },
    setSort(sort: OwnerEmployeeSort): void {
      patchState(store, {
        query: {
          ...store.query(),
          page: 0,
          sort,
        },
      });
    },
    applyFilters(): void {
      patchState(store, {
        query: {
          ...store.query(),
          page: 0,
        },
      });
      loadEmployees();
    },
    resetFilters(): void {
      patchState(store, {
        query: { ...DEFAULT_QUERY },
      });
      loadEmployees();
    },
    goToPage(page: number): void {
      const normalizedPage = Math.max(0, Math.min(page, Math.max(store.totalPages() - 1, 0)));

      patchState(store, {
        query: {
          ...store.query(),
          page: normalizedPage,
        },
      });
      loadEmployees();
    },
    openCreateModal(): void {
      patchState(store, {
        createModalOpen: true,
        createDraft: { ...EMPTY_CREATE_DRAFT },
        createErrors: {},
      });
    },
    closeCreateModal(): void {
      if (store.creating()) {
        return;
      }

      patchState(store, {
        createModalOpen: false,
        createDraft: { ...EMPTY_CREATE_DRAFT },
        createErrors: {},
      });
    },
    updateCreateDraft(patch: Partial<OwnerEmployeeCreateDraft>): void {
      patchState(store, {
        createDraft: {
          ...store.createDraft(),
          ...patch,
        },
        createErrors: {},
      });
    },
    openEmployeeDetail(employee: OwnerEmployee): void {
      patchState(store, {
        selectedEmployee: employee,
        detailModalOpen: true,
      });
    },
    closeEmployeeDetail(): void {
      patchState(store, {
        selectedEmployee: null,
        detailModalOpen: false,
      });
    },
    clearMessages(): void {
      patchState(store, {
        errorMessage: null,
        successMessage: null,
      });
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
