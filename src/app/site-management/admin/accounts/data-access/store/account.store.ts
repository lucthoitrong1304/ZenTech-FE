import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import { ToastService } from '../../../../../shared/components/toast/toast.service';
import {
  ACCOUNT_CREATE_DIALOG_OPENED_EVENT,
  ACCOUNT_DIALOG_CLOSED_EVENT,
  ACCOUNT_LOAD_REQUESTED_EVENT,
  AccountEvent,
  AccountEventType,
} from '../models/account.event';
import {
  AccountActiveFilter,
  AccountDialogMode,
  AccountQuery,
  AccountSummary,
  AccountSortField,
  AdminAccountRole,
  CreateInternalAccountPayload,
  SortDirection,
  UpdateAccountRolePayload,
  UpdateAccountStatusPayload,
} from '../models/account.model';
import { AccountService } from '../services/account.service';

interface AccountState {
  accounts: AccountSummary[];
  keyword: string;
  role: AdminAccountRole | null;
  activeFilter: AccountActiveFilter;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  sortField: AccountSortField;
  sortDirection: SortDirection;
  isLoading: boolean;
  isSubmitting: boolean;
  dialogMode: AccountDialogMode;
  selectedAccount: AccountSummary | null;
}

export interface UpdateAccountRoleCommand {
  accountId: string;
  payload: UpdateAccountRolePayload;
}

export interface UpdateAccountStatusCommand {
  accountId: string;
  payload: UpdateAccountStatusPayload;
}

const initialState: AccountState = {
  accounts: [],
  keyword: '',
  role: null,
  activeFilter: AccountActiveFilter.All,
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  sortField: AccountSortField.CreatedAt,
  sortDirection: SortDirection.Desc,
  isLoading: false,
  isSubmitting: false,
  dialogMode: AccountDialogMode.None,
  selectedAccount: null,
};

function toActiveValue(activeFilter: AccountActiveFilter): boolean | null {
  if (activeFilter === AccountActiveFilter.Active) {
    return true;
  }

  if (activeFilter === AccountActiveFilter.Locked) {
    return false;
  }

  return null;
}

export const AccountStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ accounts, keyword, role, activeFilter, page, size, sortField, sortDirection }) => ({
    query: computed<AccountQuery>(() => ({
      page: page(),
      size: size(),
      sortField: sortField(),
      sortDirection: sortDirection(),
      keyword: keyword(),
      role: role(),
      active: toActiveValue(activeFilter()),
    })),
    activeAccountsOnPage: computed(() => accounts().filter(account => account.isActive).length),
    lockedAccountsOnPage: computed(() => accounts().filter(account => !account.isActive).length),
    internalAccountsOnPage: computed(
      () => accounts().filter(account => account.role !== AdminAccountRole.CUSTOMER).length
    ),
    hasAccounts: computed(() => accounts().length > 0),
  })),
  withMethods((store, accountService = inject(AccountService), toastService = inject(ToastService)) => {
    const handleEvent = (event: AccountEvent): void => {
      switch (event.type) {
        case AccountEventType.LoadRequested:
          patchState(store, { isLoading: true });
          return;
        case AccountEventType.LoadSucceeded:
          patchState(store, {
            accounts: event.page.content,
            page: event.page.page,
            size: event.page.size,
            totalElements: event.page.totalElements,
            totalPages: event.page.totalPages,
            isLoading: false,
          });
          return;
        case AccountEventType.LoadFailed:
          patchState(store, { isLoading: false });
          return;
        case AccountEventType.SearchKeywordChanged:
          patchState(store, { keyword: event.keyword, page: 0 });
          return;
        case AccountEventType.RoleFilterChanged:
          patchState(store, { role: event.role, page: 0 });
          return;
        case AccountEventType.ActiveFilterChanged:
          patchState(store, { activeFilter: event.activeFilter, page: 0 });
          return;
        case AccountEventType.PageChanged:
          patchState(store, { page: event.page, size: event.size });
          return;
        case AccountEventType.CreateDialogOpened:
          patchState(store, { dialogMode: AccountDialogMode.Create, selectedAccount: null });
          return;
        case AccountEventType.EditRoleDialogOpened:
          patchState(store, {
            dialogMode: AccountDialogMode.EditRole,
            selectedAccount: event.account,
          });
          return;
        case AccountEventType.DialogClosed:
          patchState(store, {
            dialogMode: AccountDialogMode.None,
            selectedAccount: null,
            isSubmitting: false,
          });
          return;
        case AccountEventType.CreateSucceeded:
        case AccountEventType.RoleUpdateSucceeded:
        case AccountEventType.StatusUpdateSucceeded:
          patchState(store, {
            dialogMode: AccountDialogMode.None,
            selectedAccount: null,
            isSubmitting: false,
          });
          return;
        case AccountEventType.CreateFailed:
        case AccountEventType.RoleUpdateFailed:
        case AccountEventType.StatusUpdateFailed:
          patchState(store, { isSubmitting: false });
          return;
      }
    };

    const loadAccounts = rxMethod<void>(
      pipe(
        tap(() => handleEvent(ACCOUNT_LOAD_REQUESTED_EVENT)),
        switchMap(() =>
          accountService.getAccounts(store.query()).pipe(
            tap(response => {
              if (response.success && response.data) {
                handleEvent({ type: AccountEventType.LoadSucceeded, page: response.data });
                return;
              }

              handleEvent({ type: AccountEventType.LoadFailed });
              toastService.error(response.message || 'Không thể tải danh sách tài khoản');
            }),
            catchError(() => {
              handleEvent({ type: AccountEventType.LoadFailed });
              toastService.error('Không thể tải danh sách tài khoản');
              return EMPTY;
            })
          )
        )
      )
    );

    const createInternalAccount = rxMethod<CreateInternalAccountPayload>(
      pipe(
        tap(() => patchState(store, { isSubmitting: true })),
        switchMap(payload =>
          accountService.createInternalAccount(payload).pipe(
            tap(response => {
              if (response.success) {
                handleEvent({ type: AccountEventType.CreateSucceeded });
                toastService.success(response.message || 'Tạo tài khoản nội bộ thành công');
                loadAccounts();
                return;
              }

              handleEvent({ type: AccountEventType.CreateFailed });
              toastService.error(response.message || 'Tạo tài khoản nội bộ thất bại');
            }),
            catchError(() => {
              handleEvent({ type: AccountEventType.CreateFailed });
              toastService.error('Không thể tạo tài khoản nội bộ');
              return EMPTY;
            })
          )
        )
      )
    );

    const updateAccountRole = rxMethod<UpdateAccountRoleCommand>(
      pipe(
        tap(() => patchState(store, { isSubmitting: true })),
        switchMap(command =>
          accountService.updateAccountRole(command.accountId, command.payload).pipe(
            tap(response => {
              if (response.success) {
                handleEvent({ type: AccountEventType.RoleUpdateSucceeded });
                toastService.success(response.message || 'Cập nhật quyền thành công');
                loadAccounts();
                return;
              }

              handleEvent({ type: AccountEventType.RoleUpdateFailed });
              toastService.error(response.message || 'Cập nhật quyền thất bại');
            }),
            catchError(() => {
              handleEvent({ type: AccountEventType.RoleUpdateFailed });
              toastService.error('Không thể cập nhật quyền tài khoản');
              return EMPTY;
            })
          )
        )
      )
    );

    const updateAccountStatus = rxMethod<UpdateAccountStatusCommand>(
      pipe(
        tap(() => patchState(store, { isSubmitting: true })),
        switchMap(command =>
          accountService.updateAccountStatus(command.accountId, command.payload).pipe(
            tap(response => {
              if (response.success) {
                handleEvent({ type: AccountEventType.StatusUpdateSucceeded });
                toastService.success(response.message || 'Cập nhật trạng thái thành công');
                loadAccounts();
                return;
              }

              handleEvent({ type: AccountEventType.StatusUpdateFailed });
              toastService.error(response.message || 'Cập nhật trạng thái thất bại');
            }),
            catchError(() => {
              handleEvent({ type: AccountEventType.StatusUpdateFailed });
              toastService.error('Không thể cập nhật trạng thái tài khoản');
              return EMPTY;
            })
          )
        )
      )
    );

    return {
      dispatch(event: AccountEvent): void {
        handleEvent(event);
      },
      openCreateDialog(): void {
        handleEvent(ACCOUNT_CREATE_DIALOG_OPENED_EVENT);
      },
      closeDialog(): void {
        handleEvent(ACCOUNT_DIALOG_CLOSED_EVENT);
      },
      loadAccounts,
      createInternalAccount,
      updateAccountRole,
      updateAccountStatus,
    };
  })
);
