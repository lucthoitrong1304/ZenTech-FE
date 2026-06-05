import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideShieldAlert } from '@lucide/angular';
import { AdminStore } from '../../../data-access/store/admin.store';
import { AdminAccountRole } from '../../../data-access/models/admin.models';

@Component({
  selector: 'app-admin-permissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideShieldAlert
  ],
  templateUrl: './permissions.component.html',
  styleUrl: './permissions.component.css'
})
export class PermissionsComponent {
  protected readonly store = inject(AdminStore);
  protected readonly AdminAccountRole = AdminAccountRole;

  // The list of roles we want to display as columns in the matrix
  protected readonly roleColumns: AdminAccountRole[] = [
    AdminAccountRole.ADMIN,
    AdminAccountRole.OWNER,
    AdminAccountRole.MANAGER,
    AdminAccountRole.EMPLOYEE,
    AdminAccountRole.CUSTOMER
  ];

  protected handleToggle(permissionId: string, role: AdminAccountRole): void {
    // Prevent toggling ADMIN permissions to avoid system lockout simulation
    if (role === AdminAccountRole.ADMIN) {
      return;
    }
    this.store.togglePermission(permissionId, role);
  }
}
