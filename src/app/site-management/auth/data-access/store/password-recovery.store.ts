import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { EMPTY, catchError, switchMap, tap } from 'rxjs';
import { ForgotPasswordRequest, ResetPasswordRequest } from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import {
  AuthRequestState,
  createInitialAuthRequestState,
  parseAuthErrorMessage,
  toRequestErrorState,
  toRequestStartState,
  toRequestSuccessState,
} from './auth-store.utils';

const FORGOT_PASSWORD_SUCCESS_MESSAGE =
  'Yêu cầu đã được xử lý! Vui lòng kiểm tra email của bạn.';
const FORGOT_PASSWORD_ERROR_MESSAGE =
  'Không thể gửi email khôi phục. Vui lòng thử lại.';
const RESET_PASSWORD_SUCCESS_MESSAGE =
  'Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.';
const RESET_PASSWORD_ERROR_MESSAGE =
  'Không thể đổi mật khẩu. Link khôi phục có thể không hợp lệ hoặc đã hết hạn.';

@Injectable()
export class PasswordRecoveryStore extends ComponentStore<AuthRequestState> {
  private readonly authService = inject(AuthService);

  readonly loading$ = this.select(state => state.loading);
  readonly errorMessage$ = this.select(state => state.errorMessage);
  readonly successMessage$ = this.select(state => state.successMessage);
  readonly vm$ = this.select({
    loading: this.loading$,
    errorMessage: this.errorMessage$,
    successMessage: this.successMessage$,
  });

  readonly forgotPassword = this.effect<ForgotPasswordRequest>(payload$ =>
    payload$.pipe(
      tap(() => this.patchState(toRequestStartState())),
      switchMap(payload =>
        this.authService.forgotPassword(payload).pipe(
          tap({
            next: message =>
              this.patchState(
                toRequestSuccessState(message || FORGOT_PASSWORD_SUCCESS_MESSAGE)
              ),
            error: error =>
              this.patchState(
                toRequestErrorState(
                  parseAuthErrorMessage(error, FORGOT_PASSWORD_ERROR_MESSAGE)
                )
              ),
          }),
          catchError(() => EMPTY)
        )
      )
    )
  );

  readonly resetPassword = this.effect<ResetPasswordRequest>(payload$ =>
    payload$.pipe(
      tap(() => this.patchState(toRequestStartState())),
      switchMap(payload =>
        this.authService.resetPassword(payload).pipe(
          tap({
            next: message =>
              this.patchState(
                toRequestSuccessState(message || RESET_PASSWORD_SUCCESS_MESSAGE)
              ),
            error: error =>
              this.patchState(
                toRequestErrorState(parseAuthErrorMessage(error, RESET_PASSWORD_ERROR_MESSAGE))
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
