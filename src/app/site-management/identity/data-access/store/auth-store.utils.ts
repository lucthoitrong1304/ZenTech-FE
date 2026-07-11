import { HttpErrorResponse } from '@angular/common/http';

export interface AuthRequestState {
  loading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
}

export function createInitialAuthRequestState(): AuthRequestState {
  return {
    loading: false,
    errorMessage: null,
    successMessage: null,
  };
}

export function toRequestStartState(): AuthRequestState {
  return {
    loading: true,
    errorMessage: null,
    successMessage: null,
  };
}

export function toRequestSuccessState(message: string): AuthRequestState {
  return {
    loading: false,
    errorMessage: null,
    successMessage: message,
  };
}

export function toRequestErrorState(message: string): AuthRequestState {
  return {
    loading: false,
    errorMessage: message,
    successMessage: null,
  };
}

export function parseAuthErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof HttpErrorResponse) {
    let errorBody = error.error;

    if (typeof errorBody === 'string' && errorBody.trim()) {
      try {
        errorBody = JSON.parse(errorBody);
      } catch {
        return errorBody;
      }
    }

    if (hasMessage(errorBody)) {
      return errorBody.message;
    }
  }

  return fallbackMessage;
}

function hasMessage(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string' &&
    value.message.trim().length > 0
  );
}
