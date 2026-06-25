import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { PermissionCode } from '../permissions/permission.models';
import { PermissionService } from '../permissions/permission.service';

export const permissionGuard: CanActivateFn = route => {
  const permissionService = inject(PermissionService);
  const router = inject(Router);
  const requiredPermission = route.data['permission'] as PermissionCode | undefined;

  if (!requiredPermission) {
    return true;
  }

  return permissionService.ensureLoaded().pipe(
    map(() =>
      permissionService.has(requiredPermission)
        ? true
        : router.createUrlTree(['/management/dashboard'])
    ),
    catchError(() => of(router.createUrlTree(['/management/dashboard'])))
  );
};
