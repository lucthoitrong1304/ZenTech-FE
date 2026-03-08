import { Injectable } from '@angular/core';

export interface ErrorState {
  title: string;
  message: string;
  code?: string | number;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorStateService {
  private errorState: ErrorState | null = null;

  setError(error: ErrorState): void {
    this.errorState = error;
  }

  getError(): ErrorState | null {
    return this.errorState;
  }

  clearError(): void {
    this.errorState = null;
  }
}
