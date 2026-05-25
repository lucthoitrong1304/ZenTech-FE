import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthStorageService, StoredAuthSession } from '../services/auth-storage.service';
import { customerAuthGuard } from './customer-auth.guard';

describe('customerAuthGuard', () => {
  function runGuard(authStorageService: Partial<AuthStorageService>): boolean | UrlTree {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthStorageService,
          useValue: authStorageService,
        },
      ],
    });

    return TestBed.runInInjectionContext(() =>
      customerAuthGuard(
        {} as ActivatedRouteSnapshot,
        { url: '/account/orders' } as RouterStateSnapshot
      )
    ) as boolean | UrlTree;
  }

  it('redirects guests to login with the requested account URL', () => {
    const result = runGuard({
      isAuthenticated: () => false,
      getSession: () => null,
    });
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/auth/login?returnUrl=%2Faccount%2Forders');
  });

  it('allows authenticated customers without role checks', () => {
    const session: StoredAuthSession = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      accountId: 'account-1',
      profileId: 'profile-1',
      email: 'customer@zentech.vn',
      fullName: 'Customer User',
      roles: ['CUSTOMER'],
    };

    const result = runGuard({
      isAuthenticated: () => true,
      getSession: () => session,
    });

    expect(result).toBe(true);
  });
});
