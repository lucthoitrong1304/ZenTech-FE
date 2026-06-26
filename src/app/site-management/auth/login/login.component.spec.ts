import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Role } from '../data-access/models/auth.enums';
import { AuthSessionStore } from '../data-access/store/auth-session.store';
import { LoginStore } from '../data-access/store/login.store';
import { LoginComponent } from './login.component';

describe('LoginComponent route resolution', () => {
  let roles: string[];
  let returnUrl: string | null;

  const mockLoginStore = {
    successMessage: () => null,
    errorMessage: () => null,
    clearMessages: () => undefined,
    login: () => undefined,
    loginWithGoogle: () => undefined,
  };

  beforeEach(async () => {
    roles = [];
    returnUrl = null;

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: () => returnUrl,
              },
            },
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: () => Promise.resolve(true),
          },
        },
        {
          provide: ToastService,
          useValue: {
            success: () => undefined,
            error: () => undefined,
          },
        },
        {
          provide: AuthSessionStore,
          useValue: {
            currentUser: () => ({ roles }),
          },
        },
      ],
    })
      .overrideComponent(LoginComponent, {
        set: {
          providers: [{ provide: LoginStore, useValue: mockLoginStore }],
        },
      })
      .compileComponents();
  });

  function getPostLoginRoute(): string {
    const fixture = TestBed.createComponent(LoginComponent);
    return (fixture.componentInstance as unknown as { getPostLoginRoute: () => string }).getPostLoginRoute();
  }

  it('returns customers to a safe local returnUrl after login', () => {
    roles = [Role.CUSTOMER];
    returnUrl = '/products/abc';

    expect(getPostLoginRoute()).toBe('/products/abc');
  });

  it('keeps staff users on the management dashboard after login', () => {
    roles = [Role.EMPLOYEE];
    returnUrl = '/products/abc';

    expect(getPostLoginRoute()).toBe('/management/dashboard');
  });

  it('falls back home for unsafe returnUrl values', () => {
    roles = [Role.CUSTOMER];

    returnUrl = 'https://evil.example/login';
    expect(getPostLoginRoute()).toBe('/');

    returnUrl = '//evil.example/login';
    expect(getPostLoginRoute()).toBe('/');

    returnUrl = 'products/abc';
    expect(getPostLoginRoute()).toBe('/');
  });
});
