import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStorageService } from '../services/auth-storage.service';
import { ClientLogService } from '../logging/client-log.service';
import { ClientLogEventType } from '../logging/client-log.model';

export const customerAuthGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const authStorageService = inject(AuthStorageService);
  const clientLogService = inject(ClientLogService);

  if (!authStorageService.isAuthenticated() || !authStorageService.getSession()) {
    clientLogService.warn(ClientLogEventType.RouteGuardDenied, 'Người dùng chưa đăng nhập bị chặn khỏi trang yêu cầu tài khoản.', {
      routeUrl: state.url || '/account',
      reason: 'UnauthenticatedCustomerAccess',
    });
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url || '/account' },
    });
  }

  return true;
};
