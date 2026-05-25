import { accountRoutes } from './account.routes';

describe('accountRoutes', () => {
  it('redirects /account to the overview page', () => {
    const children = accountRoutes[0].children ?? [];

    expect(children).toContainEqual({ path: '', pathMatch: 'full', redirectTo: 'overview' });
  });

  it('registers all customer account sections', () => {
    const paths = (accountRoutes[0].children ?? []).map(route => route.path);

    expect(paths).toEqual(['', 'overview', 'orders', 'addresses', 'vouchers']);
  });
});
