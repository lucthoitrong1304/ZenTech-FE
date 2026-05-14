import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import {
  AuthSessionSource,
  AuthStorageService,
  CurrentAuthUser,
} from '../../../../core/services/auth-storage.service';
import { AuthService } from '../services/auth.service';
import { SocialAuthService } from '@abacritt/angularx-social-login';

interface AuthSessionState {
  currentUser: CurrentAuthUser | null;
  logoutSuccessMessage: string | null;
  logoutWarningMessage: string | null;
}

const LOGOUT_SUCCESS_MESSAGE = 'Đăng xuất thành công!';
const LOGOUT_WARNING_MESSAGE =
  'Đã đăng xuất khỏi thiết bị này, nhưng chưa thể thu hồi phiên trên máy chủ.';

const initialState: AuthSessionState = {
  currentUser: null,
  logoutSuccessMessage: null,
  logoutWarningMessage: null,
};

export const AuthSessionStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ currentUser }) => ({
    isAuthenticated: computed(() => currentUser()?.isAuthenticated === true),
  })),
  withMethods(
    (
      store,
      authService = inject(AuthService),
      authStorageService = inject(AuthStorageService),
      socialAuthService = inject(SocialAuthService),
    ) => {
      const completeLogout = (
        successMessage: string | null,
        warningMessage: string | null = null,
      ): void => {
        socialAuthService.signOut().catch(() => {});

        authStorageService.clear();
        patchState(store, {
          currentUser: null,
          logoutSuccessMessage: successMessage,
          logoutWarningMessage: warningMessage,
        });
      };

      return {
        setSession(response: AuthSessionSource): void {
          authStorageService.setSession(response);
          patchState(store, {
            currentUser: authStorageService.getCurrentUser(),
            logoutSuccessMessage: null,
            logoutWarningMessage: null,
          });
        },
        clearLogoutMessages(): void {
          patchState(store, {
            logoutSuccessMessage: null,
            logoutWarningMessage: null,
          });
        },
        logout: rxMethod<void>(
          pipe(
            tap(() =>
              patchState(store, {
                logoutSuccessMessage: null,
                logoutWarningMessage: null,
              }),
            ),
            switchMap(() => {
              const refreshToken = authStorageService.getRefreshToken();

              if (!refreshToken) {
                completeLogout(LOGOUT_SUCCESS_MESSAGE);
                return EMPTY;
              }

              return authService.logout(refreshToken).pipe(
                tap((message) => completeLogout(message || LOGOUT_SUCCESS_MESSAGE)),
                catchError(() => {
                  completeLogout(null, LOGOUT_WARNING_MESSAGE);
                  return EMPTY;
                }),
              );
            }),
          ),
        ),
      };
    },
  ),
  withHooks({
    onInit(store) {
      const authStorageService = inject(AuthStorageService);

      patchState(store, { currentUser: authStorageService.getCurrentUser() });
    },
  }),
);
