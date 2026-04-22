import { HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/api/api.service';
import { SKIP_AUTH_TOKEN, SKIP_GLOBAL_ERROR } from '../../../../core/tokens/api-context.token';
import { environment } from '../../../../../environments/environment';
import { AuthResponse } from '../models/auth-response.model';
import { Role } from '../models/auth-role.enum';
import { LoginRequest } from '../models/login-request.model';
import { RegisterCustomerPayload, RegisterRequest } from '../models/register-request.model';
import { TokenRefreshRequest } from '../models/token-refresh-request.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiService = inject(ApiService);
  private readonly authBaseUrl = `${environment.apiBaseUrl}/auth`;

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.apiService.post<LoginRequest, AuthResponse>(`${this.authBaseUrl}/login`, payload, {
      context: new HttpContext().set(SKIP_AUTH_TOKEN, true).set(SKIP_GLOBAL_ERROR, true),
    });
  }

  registerCustomer(payload: RegisterCustomerPayload): Observable<string> {
    const request: RegisterRequest = {
      ...payload,
      role: Role.CUSTOMER,
    };

    return this.apiService.postText<RegisterRequest>(`${this.authBaseUrl}/register`, request, {
      context: new HttpContext().set(SKIP_AUTH_TOKEN, true),
    });
  }

  logout(refreshToken: string): Observable<string> {
    const request: TokenRefreshRequest = { refreshToken };

    return this.apiService.postText<TokenRefreshRequest>(`${this.authBaseUrl}/logout`, request, {
      context: new HttpContext().set(SKIP_AUTH_TOKEN, true).set(SKIP_GLOBAL_ERROR, true),
    });
  }
}
