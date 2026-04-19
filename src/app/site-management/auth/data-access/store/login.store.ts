import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { EMPTY, catchError, switchMap, tap } from 'rxjs';
import { AuthStorageService } from '../../../../core/services/auth-storage.service';
import { LoginRequest } from '../models/login-request.model';
import { AuthService } from '../services/auth.service';
import {
  AuthRequestState,
  createInitialAuthRequestState,
  parseAuthErrorMessage,
  toRequestErrorState,
  toRequestStartState,
  toRequestSuccessState,
} from './auth-store.utils';

const LOGIN_SUCCESS_MESSAGE = 'Đăng nhập thành công!';
const LOGIN_ERROR_MESSAGE = 'Không thể đăng nhập. Vui lòng kiểm tra email hoặc mật khẩu.';

@Injectable()
export class LoginStore extends ComponentStore<AuthRequestState> {
  private readonly authService = inject(AuthService);
  private readonly authStorageService = inject(AuthStorageService);

  readonly loading$ = this.select(state => state.loading);
  readonly errorMessage$ = this.select(state => state.errorMessage);
  readonly successMessage$ = this.select(state => state.successMessage);
  readonly vm$ = this.select({
    loading: this.loading$,
  });

  readonly login = this.effect<LoginRequest>(payload$ =>
    payload$.pipe(
      tap(() => this.patchState(toRequestStartState())),
      switchMap(payload =>
        this.authService.login(payload).pipe(
          tap({
            next: response => {
              this.authStorageService.setSession(response);
              this.patchState(toRequestSuccessState(LOGIN_SUCCESS_MESSAGE));
            },
            error: error =>
              this.patchState(
                toRequestErrorState(parseAuthErrorMessage(error, LOGIN_ERROR_MESSAGE))
              ),
          }),
          catchError(() => EMPTY)
        )
      )
    )
  );

  constructor() {
    super(createInitialAuthRequestState());
  }

  clearMessages(): void {
    this.patchState({
      errorMessage: null,
      successMessage: null,
    });
  }
}
