import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../auth/data-access/services/auth.service';
import { ChangePasswordRequest } from '../../../auth/data-access/models/auth.models';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';

interface ChangePasswordState {
  isSaving: boolean;
}

export const ChangePasswordStore = signalStore(
  { providedIn: 'root' },
  withState<ChangePasswordState>({ isSaving: false }),
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
          switchMap(request =>
            authService.changePassword(request).pipe(
              tap(response => {
                patchState(store, { isSaving: false });
                toastService.success(response || 'Cập nhật mật khẩu thành công');
                authSessionStore.updatePasswordStatus(true);
              }),
              catchError((error) => {
                patchState(store, { isSaving: false });
                const errorMessage = error?.error?.message || error?.error || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
                toastService.error(errorMessage);
                return EMPTY;
              })
            )
          )
        )
      )
    })
  )
);
