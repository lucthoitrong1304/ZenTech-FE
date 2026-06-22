import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthStorageService, CurrentAuthUser } from '../../../../core/services/auth-storage.service';
import { AuthResponse } from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import { AuthSessionStore } from './auth-session.store';
import { LoginStore } from './login.store';

describe('LoginStore', () => {
  const currentUser: CurrentAuthUser = {
    isAuthenticated: true,
    fullName: 'Alex Nguyen',
    avatarUrl: null,
    roles: ['CUSTOMER'],
    isPasswordSet: true,
  };

  function configureStore(): {
    loginStore: InstanceType<typeof LoginStore>;
    authSessionStore: InstanceType<typeof AuthSessionStore>;
  } {
    TestBed.configureTestingModule({
      providers: [
        LoginStore,
        {
          provide: AuthService,
          useValue: {
            login: () => of(createAuthResponse()),
            logout: () => of('Logged out'),
          },
        },
        {
          provide: AuthStorageService,
          useValue: {
            getCurrentUser: () => currentUser,
            getRefreshToken: () => null,
            setSession: () => undefined,
            clear: () => undefined,
          },
        },
      ],
    });

    return {
      loginStore: TestBed.inject(LoginStore),
      authSessionStore: TestBed.inject(AuthSessionStore),
    };
  }

  it('stores the session and exposes a success message after login', () => {
    const { loginStore, authSessionStore } = configureStore();

    loginStore.login({ email: 'alex@zentech.vn', password: 'secret' });

    expect(loginStore.loading()).toBe(false);
    expect(loginStore.successMessage()).toBeTruthy();
    expect(authSessionStore.isAuthenticated()).toBe(true);
    expect(authSessionStore.currentUser()?.fullName).toBe('Alex Nguyen');
  });
});

function createAuthResponse(): AuthResponse {
  return {
    accessToken: 'access',
    refreshToken: 'refresh',
    type: 'Bearer',
    accountId: 'account-1',
    profileId: 'profile-1',
    email: 'alex@zentech.vn',
    fullName: 'Alex Nguyen',
    roles: ['CUSTOMER'],
    imageUrl: null,
  };
}
