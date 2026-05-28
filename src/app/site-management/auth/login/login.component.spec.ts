import '@angular/compiler';
import { Role } from '../data-access/models/auth.enums';
import { getSafeReturnUrl, resolvePostLoginRoute } from './login.component';

describe('LoginComponent route resolution', () => {
  it('returns customers to a safe local returnUrl after login', () => {
    expect(resolvePostLoginRoute([Role.CUSTOMER], '/products/abc')).toBe('/products/abc');
  });

  it('keeps staff users on the management dashboard after login', () => {
    expect(resolvePostLoginRoute([Role.EMPLOYEE], '/products/abc')).toBe(
      '/management/dashboard'
    );
  });

  it('falls back home for unsafe returnUrl values', () => {
    expect(getSafeReturnUrl('https://evil.example/login')).toBe('/');
    expect(getSafeReturnUrl('//evil.example/login')).toBe('/');
    expect(getSafeReturnUrl('products/abc')).toBe('/');
  });
});
