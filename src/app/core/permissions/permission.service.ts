import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from '../api/api.service';
import { AuthStorageService } from '../services/auth-storage.service';
import {
  ApiResponse,
  ConfigurableRole,
  CurrentPermissions,
  PermissionCode,
  PermissionMatrix,
} from './permission.models';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly api = inject(ApiService);
  private readonly authStorage = inject(AuthStorageService);
  private readonly permissionSet = signal<ReadonlySet<PermissionCode>>(new Set());
  private readonly loadedAccountId = signal<string | null>(null);
  private readonly loading = signal(false);
  private loadRequest$: Observable<boolean> | null = null;

  readonly permissions = computed(() => [...this.permissionSet()]);
  readonly isLoaded = computed(
    () => this.loadedAccountId() === (this.authStorage.getSession()?.accountId ?? null)
  );

  ensureLoaded(): Observable<boolean> {
    const accountId = this.authStorage.getSession()?.accountId ?? null;
    if (!accountId) {
      this.clear();
      return of(false);
    }
    if (this.loadedAccountId() === accountId) {
      return of(true);
    }
    if (this.loadRequest$) {
      return this.loadRequest$;
    }

    this.loading.set(true);
    this.loadRequest$ = this.api
      .get<ApiResponse<CurrentPermissions>>(`${environment.apiBaseUrl}/auth/me/permissions`)
      .pipe(
        tap(response => {
          this.permissionSet.set(new Set(response.data.permissions));
          this.loadedAccountId.set(accountId);
        }),
        map(() => true),
        finalize(() => {
          this.loading.set(false);
          this.loadRequest$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    return this.loadRequest$;
  }

  has(permission: PermissionCode): boolean {
    return this.permissionSet().has(permission);
  }

  clear(): void {
    this.permissionSet.set(new Set());
    this.loadedAccountId.set(null);
  }

  getMatrix(): Observable<ApiResponse<PermissionMatrix>> {
    return this.api.get<ApiResponse<PermissionMatrix>>(
      `${environment.apiBaseUrl}/admin/permissions`
    );
  }

  updateRole(
    role: ConfigurableRole,
    permissions: PermissionCode[]
  ): Observable<ApiResponse<PermissionCode[]>> {
    return this.api.put<{ permissions: PermissionCode[] }, ApiResponse<PermissionCode[]>>(
      `${environment.apiBaseUrl}/admin/permissions/${role}`,
      { permissions }
    );
  }
}
