import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import { LoginRequest } from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import { AuthSessionStore } from './auth-session.store';
import { ClientLogService } from '../../../../core/logging/client-log.service';
import { ClientLogEventType } from '../../../../core/logging/client-log.model';
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

export const LoginStore = signalStore(
  withState<AuthRequestState>(createInitialAuthRequestState()),
  withComputed(({ loading }) => ({
    vm: computed(() => ({ loading: loading() })),
  })),
  withMethods(
    (
      store,
      authService = inject(AuthService),
      authSessionStore = inject(AuthSessionStore),
      clientLogService = inject(ClientLogService),
    ) => ({
      login: rxMethod<LoginRequest>(
        pipe(
          tap(() => patchState(store, toRequestStartState())),
          switchMap((payload) =>
            authService.login(payload).pipe(
              tap({
                next: (response) => {
                  authSessionStore.setSession(response);
                  patchState(store, toRequestSuccessState(LOGIN_SUCCESS_MESSAGE));

                  clientLogService.info(
                    ClientLogEventType.AuthLoginSucceeded,
                    `User ${response.email} đăng nhập thành công bằng Email.`,
                    {
                      routeUrl: '/auth/login',
                      userEmail: response.email,
                    },
                  );
                },
                error: (error) => {
                  patchState(
                    store,
                    toRequestErrorState(parseAuthErrorMessage(error, LOGIN_ERROR_MESSAGE)),
                  );

                  clientLogService.warn(
                    ClientLogEventType.AuthLoginFailed,
                    `User đăng nhập thất bại bằng Email. Target: ${payload.email}`,
                    {
                      routeUrl: '/auth/login',
                      userEmail: payload.email,
                      reason: parseAuthErrorMessage(error, LOGIN_ERROR_MESSAGE),
                    },
                  );
                },
              }),
              catchError(() => EMPTY),
            ),
          ),
        ),
      ),

      loginWithGoogle: rxMethod<string>(
        pipe(
          tap(() => patchState(store, toRequestStartState())),
          switchMap((token) =>
            authService.loginWithGoogle(token).pipe(
              tap({
                next: (response) => {
                  authSessionStore.setSession(response);
                  patchState(store, toRequestSuccessState(LOGIN_SUCCESS_MESSAGE));

                  clientLogService.info(
                    ClientLogEventType.AuthLoginSucceeded,
                    `User ${response.email} đăng nhập thành công bằng Google.`,
                    {
                      routeUrl: '/auth/login',
                      userEmail: response.email,
                    },
                  );
                },
                error: (error) => {
                  patchState(
                    store,
                    toRequestErrorState(parseAuthErrorMessage(error, 'Đăng nhập Google thất bại.')),
                  );

                  clientLogService.warn(
                    ClientLogEventType.AuthLoginFailed,
                    'User đăng nhập thất bại bằng Google.',
                    {
                      routeUrl: '/auth/login',
                      reason: parseAuthErrorMessage(error, 'Đăng nhập Google thất bại.'),
                    },
                  );
                },
              }),
              catchError(() => EMPTY),
            ),
          ),
        ),
      ),

      clearMessages(): void {
        patchState(store, {
          errorMessage: null,
          successMessage: null,
        });
      },
    }),
  ),
);
