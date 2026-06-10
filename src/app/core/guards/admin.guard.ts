import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStorageService } from '../services/auth-storage.service';
import { Role } from '../../site-management/auth/data-access/models/auth.enums';
import { hasRole } from '../../site-management/auth/data-access/utils/auth-role.utils';
import { ClientLogService } from '../logging/client-log.service';
import { ClientLogEventType } from '../logging/client-log.model';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authStorageService = inject(AuthStorageService);
  const clientLogService = inject(ClientLogService);
  const session = authStorageService.getSession();

  if (!authStorageService.isAuthenticated() || !session) {
    clientLogService.warn(ClientLogEventType.RouteGuardDenied, 'Người dùng chưa đăng nhập bị chặn khỏi khu vực Admin.', {
      routeUrl: '/admin',
      reason: 'UnauthenticatedAdminAccess',
    });
    return router.createUrlTree(['/auth/login']);
  }

  if (!hasRole(session.roles, Role.ADMIN)) {
    clientLogService.warn(ClientLogEventType.RouteGuardDenied, 'Người dùng không đủ quyền truy cập khu vực Admin.', {
      routeUrl: '/admin',
      userEmail: session.email,
      reason: 'MissingAdminRole',
    });
    return router.createUrlTree(['/']);
  }

  return true;
};
