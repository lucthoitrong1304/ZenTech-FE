import { accountRoutes } from './account.routes';
import { customerAuthGuard } from '../../core/guards/customer-auth.guard';

describe('accountRoutes', () => {
  it('protects the account layout with customerAuthGuard', () => {
    expect(accountRoutes[0].canActivate).toContain(customerAuthGuard);
  });

  it('redirects /account to the overview page', () => {
    const children = accountRoutes[0].children ?? [];

    expect(children).toContainEqual({ path: '', pathMatch: 'full', redirectTo: 'overview' });
  });

  it('registers all customer account sections', () => {
    const paths = (accountRoutes[0].children ?? []).map(route => route.path);

    expect(paths).toEqual(['', 'overview', 'orders', 'addresses', 'vouchers']);
  });
});
