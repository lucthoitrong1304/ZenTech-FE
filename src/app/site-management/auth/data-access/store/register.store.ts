import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { EMPTY, catchError, switchMap, tap } from 'rxjs';
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

@Injectable()
export class RegisterStore extends ComponentStore<AuthRequestState> {
  private readonly authService = inject(AuthService);

  readonly loading$ = this.select(state => state.loading);
  readonly errorMessage$ = this.select(state => state.errorMessage);
  readonly successMessage$ = this.select(state => state.successMessage);
  readonly vm$ = this.select({
    loading: this.loading$,
    errorMessage: this.errorMessage$,
    successMessage: this.successMessage$,
  });

  readonly register = this.effect<RegisterCustomerPayload>(payload$ =>
    payload$.pipe(
      tap(() => this.patchState(toRequestStartState())),
      switchMap(payload =>
        this.authService.registerCustomer(payload).pipe(
          tap({
            next: message =>
              this.patchState(toRequestSuccessState(message || REGISTER_SUCCESS_MESSAGE)),
            error: error =>
              this.patchState(
                toRequestErrorState(parseAuthErrorMessage(error, REGISTER_ERROR_MESSAGE))
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
