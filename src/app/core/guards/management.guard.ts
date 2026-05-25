import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStorageService } from '../services/auth-storage.service';
import { Role } from '../../site-management/auth/data-access/models/auth.enums';
import { hasRole } from '../../site-management/auth/data-access/utils/auth-role.utils';

export const managementGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authStorageService = inject(AuthStorageService);
  const session = authStorageService.getSession();

  if (!authStorageService.isAuthenticated() || !session) {
    return router.createUrlTree(['/auth/login']);
  }

  if (!hasRole(session.roles, Role.OWNER) && !hasRole(session.roles, Role.MANAGER) && !hasRole(session.roles, Role.EMPLOYEE)) {
    return router.createUrlTree(['/']);
  }

  return true;
};
