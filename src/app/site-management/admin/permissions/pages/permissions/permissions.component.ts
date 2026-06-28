import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import {
  LucideCheck,
  LucideCrown,
  LucideRotateCcw,
  LucideSave,
  LucideShieldAlert,
  LucideShieldCheck,
} from '@lucide/angular';
import { ConfigurableRole, PermissionCode } from '../../../../../core/permissions/permission.models';
import { PermissionMatrixStore } from '../../data-access/permission-matrix.store';

@Component({
  selector: 'app-admin-permissions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    LucideCheck,
    LucideCrown,
    LucideRotateCcw,
    LucideSave,
    LucideShieldAlert,
    LucideShieldCheck,
  ],
  templateUrl: './permissions.component.html',
  styleUrl: './permissions.component.css',
})
export class PermissionsComponent implements OnInit {
  protected readonly store = inject(PermissionMatrixStore);

  ngOnInit(): void {
    this.store.load();
  }

  protected toggle(role: ConfigurableRole, permission: PermissionCode): void {
    if (this.store.savingRole() === null) this.store.toggle(role, permission);
  }

  protected save(role: ConfigurableRole): void {
    this.store.save(role);
  }

  protected reset(role: ConfigurableRole): void {
    this.store.reset(role);
  }
}