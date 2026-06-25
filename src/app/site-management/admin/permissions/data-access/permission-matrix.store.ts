import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import {
  ConfigurableRole,
  PermissionCode,
  PermissionMatrix,
  PermissionModule,
} from '../../../../core/permissions/permission.models';
import { PermissionService } from '../../../../core/permissions/permission.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';

@Injectable({ providedIn: 'root' })
export class PermissionMatrixStore {
  private readonly permissionService = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly matrixState = signal<PermissionMatrix | null>(null);
  private readonly drafts = signal<Record<ConfigurableRole, ReadonlySet<PermissionCode>>>({
    OWNER: new Set(),
    MANAGER: new Set(),
    EMPLOYEE: new Set(),
  });

  readonly loading = signal(false);
  readonly savingRole = signal<ConfigurableRole | null>(null);
  readonly modules = computed<PermissionModule[]>(() => this.matrixState()?.modules ?? []);
  readonly roles = computed<ConfigurableRole[]>(
    () => this.matrixState()?.configurableRoles ?? ['OWNER', 'MANAGER', 'EMPLOYEE']
  );
  readonly totalPermissions = computed(
    () => this.modules().reduce((total, module) => total + module.permissions.length, 0)
  );

  load(): void {
    this.loading.set(true);
    this.permissionService
      .getMatrix()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => {
          this.matrixState.set(response.data);
          this.resetDrafts(response.data);
        },
        error: () => this.toast.error('Không thể tải ma trận phân quyền'),
      });
  }

  has(role: ConfigurableRole, permission: PermissionCode): boolean {
    return this.drafts()[role].has(permission);
  }

  toggle(role: ConfigurableRole, permission: PermissionCode): void {
    this.drafts.update(current => {
      const nextRolePermissions = new Set(current[role]);
      nextRolePermissions.has(permission)
        ? nextRolePermissions.delete(permission)
        : nextRolePermissions.add(permission);
      return { ...current, [role]: nextRolePermissions };
    });
  }

  isDirty(role: ConfigurableRole): boolean {
    const persisted = new Set(this.matrixState()?.rolePermissions[role] ?? []);
    const draft = this.drafts()[role];
    return persisted.size !== draft.size || [...persisted].some(permission => !draft.has(permission));
  }

  permissionCount(role: ConfigurableRole): number {
    return this.drafts()[role].size;
  }

  reset(role: ConfigurableRole): void {
    const persisted = this.matrixState()?.rolePermissions[role] ?? [];
    this.drafts.update(current => ({ ...current, [role]: new Set(persisted) }));
  }

  save(role: ConfigurableRole): void {
    const before = new Set(this.matrixState()?.rolePermissions[role] ?? []);
    const requested = [...this.drafts()[role]];
    this.savingRole.set(role);
    this.permissionService
      .updateRole(role, requested)
      .pipe(finalize(() => this.savingRole.set(null)))
      .subscribe({
        next: response => {
          this.matrixState.update(matrix =>
            matrix
              ? {
                  ...matrix,
                  rolePermissions: { ...matrix.rolePermissions, [role]: response.data },
                }
              : matrix
          );
          this.drafts.update(current => ({ ...current, [role]: new Set(response.data) }));
          this.toast.success(`Đã lưu quyền cho ${role}`);
        },
        error: () => {
          this.drafts.update(current => ({ ...current, [role]: before }));
          this.toast.error(`Không thể lưu quyền cho ${role}; thay đổi đã được hoàn tác`);
        },
      });
  }

  private resetDrafts(matrix: PermissionMatrix): void {
    this.drafts.set({
      OWNER: new Set(matrix.rolePermissions.OWNER ?? []),
      MANAGER: new Set(matrix.rolePermissions.MANAGER ?? []),
      EMPLOYEE: new Set(matrix.rolePermissions.EMPLOYEE ?? []),
    });
  }
}
