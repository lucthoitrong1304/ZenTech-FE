import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideUserPlus,
  LucideEdit,
  LucideLock,
  LucideUnlock,
  LucideSearch,
  LucideX
} from '@lucide/angular';
import { AdminStore } from '../../../data-access/store/admin.store';
import { AdminAccountRole, AdminAccount } from '../../../data-access/models/admin.models';

@Component({
  selector: 'app-admin-accounts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideUserPlus,
    LucideEdit,
    LucideLock,
    LucideUnlock,
    LucideSearch,
    LucideX
  ],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.css'
})
export class AccountsComponent {
  protected readonly store = inject(AdminStore);
  protected readonly AdminAccountRole = AdminAccountRole;

  protected readonly searchText = signal('');
  protected readonly isModalOpen = signal(false);
  protected readonly isEditMode = signal(false);
  protected readonly selectedAccountId = signal<string | null>(null);

  // Form states
  protected editFullName = '';
  protected editEmail = '';
  protected editRole = AdminAccountRole.EMPLOYEE;
  protected editActive = true;

  protected handleSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    this.store.setAccountSearch(value);
  }

  protected openAddModal(): void {
    this.isEditMode.set(false);
    this.selectedAccountId.set(null);
    this.editFullName = '';
    this.editEmail = '';
    this.editRole = AdminAccountRole.EMPLOYEE;
    this.editActive = true;
    this.isModalOpen.set(true);
  }

  protected openEditModal(account: AdminAccount): void {
    this.isEditMode.set(true);
    this.selectedAccountId.set(account.id);
    this.editFullName = account.fullName;
    this.editEmail = account.email;
    this.editRole = account.roles[0] || AdminAccountRole.CUSTOMER;
    this.editActive = account.active;
    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedAccountId.set(null);
  }

  protected handleSaveAccount(): void {
    if (!this.editFullName.trim() || !this.editEmail.trim()) {
      alert('Vui lòng điền đầy đủ họ tên và email!');
      return;
    }

    if (this.isEditMode()) {
      const id = this.selectedAccountId();
      if (id) {
        this.store.updateAccount(id, this.editFullName.trim(), this.editEmail.trim(), this.editRole, this.editActive);
      }
    } else {
      this.store.addAccount(this.editFullName.trim(), this.editEmail.trim(), this.editRole);
    }

    this.closeModal();
  }

  protected toggleAccountStatus(account: AdminAccount): void {
    const nextActive = !account.active;
    const role = account.roles[0] || AdminAccountRole.CUSTOMER;
    this.store.updateAccount(account.id, account.fullName, account.email, role, nextActive);
  }

  protected getRoleBadgeClass(role: AdminAccountRole): string {
    return 'role-' + role.toLowerCase();
  }

  protected getAccountInitials(fullName: string): string {
    const initials = fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
    return initials || 'ZT';
  }
}
