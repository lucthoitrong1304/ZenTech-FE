import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { EMPTY, catchError, switchMap, tap } from 'rxjs';
import {
  AuthSessionSource,
  AuthStorageService,
  CurrentAuthUser,
} from '../../../../core/services/auth-storage.service';
import { AuthService } from '../services/auth.service';

interface AuthSessionState {
  currentUser: CurrentAuthUser | null;
  logoutSuccessMessage: string | null;
  logoutWarningMessage: string | null;
}

const LOGOUT_SUCCESS_MESSAGE = 'Đăng xuất thành công!';
const LOGOUT_WARNING_MESSAGE =
  'Đã đăng xuất khỏi thiết bị này, nhưng chưa thể thu hồi phiên trên máy chủ.';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionStore extends ComponentStore<AuthSessionState> {
  private readonly authService = inject(AuthService);
  private readonly authStorageService = inject(AuthStorageService);

  readonly currentUser$ = this.select(state => state.currentUser);
  readonly isAuthenticated$ = this.select(
    this.currentUser$,
    currentUser => currentUser?.isAuthenticated === true
  );
  readonly logoutSuccessMessage$ = this.select(state => state.logoutSuccessMessage);
  readonly logoutWarningMessage$ = this.select(state => state.logoutWarningMessage);

  readonly logout = this.effect<void>(trigger$ =>
    trigger$.pipe(
      tap(() => this.clearLogoutMessages()),
      switchMap(() => {
        const refreshToken = this.authStorageService.getRefreshToken();

        if (!refreshToken) {
          this.completeLogout(LOGOUT_SUCCESS_MESSAGE);
          return EMPTY;
        }

        return this.authService.logout(refreshToken).pipe(
          tap(message => this.completeLogout(message || LOGOUT_SUCCESS_MESSAGE)),
          catchError(() => {
            this.completeLogout(null, LOGOUT_WARNING_MESSAGE);
            return EMPTY;
          })
        );
      })
    )
  );

  constructor() {
    super({
      currentUser: null,
      logoutSuccessMessage: null,
      logoutWarningMessage: null,
    });
    this.patchState({ currentUser: this.authStorageService.getCurrentUser() });
  }

  setSession(response: AuthSessionSource): void {
    this.authStorageService.setSession(response);
    this.patchState({
      currentUser: this.authStorageService.getCurrentUser(),
      logoutSuccessMessage: null,
      logoutWarningMessage: null,
    });
  }

  clearLogoutMessages(): void {
    this.patchState({
      logoutSuccessMessage: null,
      logoutWarningMessage: null,
    });
  }

  private completeLogout(successMessage: string | null, warningMessage: string | null = null): void {
    this.authStorageService.clear();
    this.patchState({
      currentUser: null,
      logoutSuccessMessage: successMessage,
      logoutWarningMessage: warningMessage,
    });
  }
}
