import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStorageService } from '../services/auth-storage.service';

export const customerAuthGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const authStorageService = inject(AuthStorageService);

  if (!authStorageService.isAuthenticated() || !authStorageService.getSession()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url || '/account' },
    });
  }

  return true;
};
