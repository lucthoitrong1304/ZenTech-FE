import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
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

export const PasswordRecoveryStore = signalStore(
  withState<AuthRequestState>(createInitialAuthRequestState()),
  withComputed(({ loading, errorMessage, successMessage }) => ({
    vm: computed(() => ({
      loading: loading(),
      errorMessage: errorMessage(),
      successMessage: successMessage(),
    })),
  })),
  withMethods((store, authService = inject(AuthService)) => ({
    forgotPassword: rxMethod<ForgotPasswordRequest>(
      pipe(
        tap(() => patchState(store, toRequestStartState())),
        switchMap(payload =>
          authService.forgotPassword(payload).pipe(
            tap({
              next: message =>
                patchState(
                  store,
                  toRequestSuccessState(message || FORGOT_PASSWORD_SUCCESS_MESSAGE)
                ),
              error: error =>
                patchState(
                  store,
                  toRequestErrorState(parseAuthErrorMessage(error, FORGOT_PASSWORD_ERROR_MESSAGE))
                ),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    ),
    resetPassword: rxMethod<ResetPasswordRequest>(
      pipe(
        tap(() => patchState(store, toRequestStartState())),
        switchMap(payload =>
          authService.resetPassword(payload).pipe(
            tap({
              next: message =>
                patchState(
                  store,
                  toRequestSuccessState(message || RESET_PASSWORD_SUCCESS_MESSAGE)
                ),
              error: error =>
                patchState(
                  store,
                  toRequestErrorState(parseAuthErrorMessage(error, RESET_PASSWORD_ERROR_MESSAGE))
                ),
            }),
            catchError(() => EMPTY)
          )
        )
      )
    ),
    clearMessages(): void {
      patchState(store, {
        errorMessage: null,
        successMessage: null,
      });
    },
  }))
);
