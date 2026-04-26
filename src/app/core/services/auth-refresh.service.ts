import { HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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

  refresh(refreshToken: string): Observable<AuthSessionSource> {
    const request: RefreshTokenRequest = { refreshToken };

    return this.apiService.post<RefreshTokenRequest, AuthSessionSource>(this.refreshUrl, request, {
      context: new HttpContext().set(SKIP_AUTH_TOKEN, true).set(SKIP_GLOBAL_ERROR, true),
    });
  }
}
