import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStorageService } from '../services/auth-storage.service';
import { Role } from '../../site-management/auth/data-access/models/auth.enums';
import { hasRole } from '../../site-management/auth/data-access/utils/auth-role.utils';

export const homeRedirectGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authStorageService = inject(AuthStorageService);
  const session = authStorageService.getSession();

  if (authStorageService.isAuthenticated() && session) {
    if (hasRole(session.roles, Role.ADMIN)) {
      return router.createUrlTree(['/admin/dashboard']);
    }
    if (
      hasRole(session.roles, Role.OWNER) ||
      hasRole(session.roles, Role.MANAGER) ||
      hasRole(session.roles, Role.EMPLOYEE)
    ) {
      return router.createUrlTree(['/management/dashboard']);
    }
  }

  return true;
};
