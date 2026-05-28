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
import { Role } from '../models/auth.enums';
import { hasRole } from '../utils/auth-role.utils';
import { AccountService } from '../../../account/data-access/services/account.service';
import { ProfileService } from '../../../management/data-access/services/profile.service';

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
      accountService = inject(AccountService),
      profileService = inject(ProfileService)
    ) => {
      const completeLogout = (
        successMessage: string | null,
        warningMessage: string | null = null
      ): void => {
        authStorageService.clear();
        patchState(store, {
          currentUser: null,
          logoutSuccessMessage: successMessage,
          logoutWarningMessage: warningMessage,
        });
      };

      const loadProfile = rxMethod<void>(
        pipe(
          switchMap(() => {
            const roles = authStorageService.getCurrentUser()?.roles || [];
            
            const handleResponse = tap((res: any) => {
              if (res.success && res.data) {
                const fullName = res.data.fullName || '';
                const avatarUrl = res.data.imageUrl || null;
                if (typeof authStorageService.updateProfileInfo === 'function') {
                  authStorageService.updateProfileInfo(fullName, avatarUrl);
                }
                const currentUser = store.currentUser();
                if (currentUser) {
                  patchState(store, {
                    currentUser: {
                      ...currentUser,
                      fullName,
                      avatarUrl,
                    },
                  });
                }
              }
            });

            if (hasRole(roles, Role.CUSTOMER)) {
              return accountService.getProfile().pipe(handleResponse, catchError(() => EMPTY));
            } else {
              return profileService.getMyProfile().pipe(handleResponse, catchError(() => EMPTY));
            }
          })
        )
      );

      return {
        loadProfile,
        updateCurrentUserProfile(fullName: string, avatarUrl: string | null): void {
          if (typeof authStorageService.updateProfileInfo === 'function') {
            authStorageService.updateProfileInfo(fullName, avatarUrl);
          }
          const currentUser = store.currentUser();
          if (currentUser) {
            patchState(store, {
              currentUser: {
                ...currentUser,
                fullName,
                avatarUrl,
              },
            });
          }
        },
        updatePasswordStatus(isPasswordSet: boolean): void {
          if (typeof authStorageService.updatePasswordStatus === 'function') {
            authStorageService.updatePasswordStatus(isPasswordSet);
          }
          const currentUser = store.currentUser();
          if (currentUser) {
            patchState(store, {
              currentUser: {
                ...currentUser,
                isPasswordSet,
              },
            });
          }
        },
        setSession(response: AuthSessionSource): void {
          authStorageService.setSession(response);
          patchState(store, {
            currentUser: authStorageService.getCurrentUser(),
            logoutSuccessMessage: null,
            logoutWarningMessage: null,
          });
          loadProfile();
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
              })
            ),
            switchMap(() => {
              const refreshToken = authStorageService.getRefreshToken();

              if (!refreshToken) {
                completeLogout(LOGOUT_SUCCESS_MESSAGE);
                return EMPTY;
              }

              return authService.logout(refreshToken).pipe(
                tap(message => completeLogout(message || LOGOUT_SUCCESS_MESSAGE)),
                catchError(() => {
                  completeLogout(null, LOGOUT_WARNING_MESSAGE);
                  return EMPTY;
                })
              );
            })
          )
        ),
      };
    }
  ),
  withHooks({
    onInit(store) {
      const authStorageService = inject(AuthStorageService);

      patchState(store, { currentUser: authStorageService.getCurrentUser() });
      if (typeof authStorageService.isAuthenticated === 'function' && authStorageService.isAuthenticated()) {
        store.loadProfile();
      }
    },
  })
);
