import { HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { finalize, Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from '../api/api.service';
import { AuthSessionSource } from './auth-storage.service';
import { SKIP_AUTH_TOKEN, SKIP_GLOBAL_ERROR } from '../tokens/api-context.token';

interface RefreshTokenRequest {
  refreshToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthRefreshService {
  private readonly apiService = inject(ApiService);
  private readonly refreshUrl = `${environment.apiBaseUrl}/auth/refresh-token`;
  private refreshRequest$: Observable<AuthSessionSource> | null = null;
  private refreshRequestToken: string | null = null;
  private refreshRequestId: symbol | null = null;

  refresh(refreshToken: string): Observable<AuthSessionSource> {
    if (this.refreshRequest$ && this.refreshRequestToken === refreshToken) {
      return this.refreshRequest$;
    }

    const request: RefreshTokenRequest = { refreshToken };
    const requestId = Symbol('auth-refresh-request');
    this.refreshRequestId = requestId;
    this.refreshRequestToken = refreshToken;

    this.refreshRequest$ = this.apiService
      .post<RefreshTokenRequest, AuthSessionSource>(this.refreshUrl, request, {
        context: new HttpContext().set(SKIP_AUTH_TOKEN, true).set(SKIP_GLOBAL_ERROR, true),
      })
      .pipe(
        finalize(() => {
          if (this.refreshRequestId === requestId) {
            this.refreshRequest$ = null;
            this.refreshRequestToken = null;
            this.refreshRequestId = null;
          }
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this.refreshRequest$;
  }
}
