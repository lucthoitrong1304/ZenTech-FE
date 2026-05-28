import { routes } from './app.routes';

describe('appRoutes', () => {
  it('keeps the home page route public', () => {
    const homeRoute = routes.find(route => route.path === '');

    expect(homeRoute).toBeTruthy();
    expect(homeRoute?.canActivate).toBeUndefined();
  });
});
