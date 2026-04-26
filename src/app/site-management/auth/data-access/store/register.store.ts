import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, pipe, switchMap, tap } from 'rxjs';
import { RegisterCustomerPayload } from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import {
  AuthRequestState,
  createInitialAuthRequestState,
  parseAuthErrorMessage,
  toRequestErrorState,
  toRequestStartState,
  toRequestSuccessState,
} from './auth-store.utils';

const REGISTER_SUCCESS_MESSAGE = 'Đăng ký tài khoản thành công!';
const REGISTER_ERROR_MESSAGE = 'Không thể đăng ký tài khoản. Vui lòng thử lại.';

export const RegisterStore = signalStore(
  withState<AuthRequestState>(createInitialAuthRequestState()),
  withComputed(({ loading, errorMessage, successMessage }) => ({
    vm: computed(() => ({
      loading: loading(),
      errorMessage: errorMessage(),
      successMessage: successMessage(),
    })),
  })),
  withMethods((store, authService = inject(AuthService)) => ({
    register: rxMethod<RegisterCustomerPayload>(
      pipe(
        tap(() => patchState(store, toRequestStartState())),
        switchMap(payload =>
          authService.registerCustomer(payload).pipe(
            tap({
              next: message =>
                patchState(store, toRequestSuccessState(message || REGISTER_SUCCESS_MESSAGE)),
              error: error =>
                patchState(
                  store,
                  toRequestErrorState(parseAuthErrorMessage(error, REGISTER_ERROR_MESSAGE))
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
