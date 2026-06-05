import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AuthService } from '../../../auth/data-access/services/auth.service';
import { ChangePasswordRequest } from '../../../auth/data-access/models/auth.models';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';

interface AdminChangePasswordState {
  isSaving: boolean;
}

export const AdminChangePasswordStore = signalStore(
  { providedIn: 'root' },
  withState<AdminChangePasswordState>({ isSaving: false }),
  withMethods(
    (
      store,
      authService = inject(AuthService),
      toastService = inject(ToastService),
      authSessionStore = inject(AuthSessionStore)
    ) => ({
      changePassword: rxMethod<ChangePasswordRequest>(
        pipe(
          tap(() => patchState(store, { isSaving: true })),
          switchMap(payload =>
            authService.changePassword(payload).pipe(
              tap(message => {
                patchState(store, { isSaving: false });
                authSessionStore.updatePasswordStatus(true);
                toastService.success(message || 'Đổi mật khẩu admin thành công');
              }),
              catchError(error => {
                patchState(store, { isSaving: false });
                const message =
                  typeof error?.error === 'string'
                    ? error.error
                    : error?.error?.message || 'Không thể đổi mật khẩu. Vui lòng thử lại.';
                toastService.error(message);
                return EMPTY;
              })
            )
          )
        )
      ),
    })
  )
);
