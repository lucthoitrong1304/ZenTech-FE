import { Injectable } from '@angular/core';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const AUTH_SESSION_KEY = 'auth_session';

export interface AuthSessionSource {
  accessToken: string;
  refreshToken: string;
  type?: string;
  accountId: string;
  profileId: string;
  email: string;
  fullName: string;
  roles: string[];
  expiresIn?: number;
}

export interface StoredAuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  accountId: string;
  profileId: string;
  email: string;
  fullName: string;
  roles: string[];
  expiresIn?: number;
}

export interface CurrentAuthUser {
  isAuthenticated: boolean;
  fullName?: string;
  avatarUrl?: string | null;
  roles: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AuthStorageService {
  setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  removeAccessToken(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setSession(response: AuthSessionSource): void {
    const session: StoredAuthSession = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      tokenType: response.type || 'Bearer',
      accountId: response.accountId,
      profileId: response.profileId,
      email: response.email,
      fullName: response.fullName,
      roles: response.roles,
      expiresIn: response.expiresIn,
    };

    this.setAccessToken(session.accessToken);
    this.setRefreshToken(session.refreshToken);
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  }

  getSession(): StoredAuthSession | null {
    const rawSession = localStorage.getItem(AUTH_SESSION_KEY);

    if (!rawSession) {
      return null;
    }

    try {
      return JSON.parse(rawSession) as StoredAuthSession;
    } catch {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
  }

  getCurrentUser(): CurrentAuthUser | null {
    if (!this.isAuthenticated()) {
      return null;
    }

    const session = this.getSession();

    return {
      isAuthenticated: true,
      fullName: session?.fullName || session?.email,
      avatarUrl: null,
      roles: session?.roles || [],
    };
  }

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}
