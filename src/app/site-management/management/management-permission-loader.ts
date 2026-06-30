import { Type, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PermissionCode } from '../../core/permissions/permission.models';
import { PermissionService } from '../../core/permissions/permission.service';

export type ManagementComponentLoader = () => Promise<Type<unknown>>;

export function loadManagementPermissionComponent(
  permission: PermissionCode,
  loader: ManagementComponentLoader,
): ManagementComponentLoader {
  return async () => {
    const permissionService = inject(PermissionService);

    await firstValueFrom(permissionService.ensureLoaded());

    if (permissionService.has(permission)) {
      return loader();
    }

    const component = await import(
      './pages/management-no-permission/management-no-permission.component'
    );

    return component.ManagementNoPermissionComponent;
  };
}
