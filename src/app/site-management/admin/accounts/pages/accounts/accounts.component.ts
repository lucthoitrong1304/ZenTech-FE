import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideLock,
  LucideRefreshCw,
  LucideSearch,
  LucideShieldCheck,
  LucideUnlock,
  LucideUserCog,
  LucideUserPlus,
  LucideUsers,
  LucideLayoutGrid,
  LucideLayoutList,
  LucideMail,
  LucideUser,
  LucideCalendar,
} from '@lucide/angular';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AccountEventType } from '../../data-access/models/account.event';
import {
  AccountActiveFilter,
  AccountDialogMode,
  AccountRoleOption,
  AccountStatusOption,
  AccountSummary,
  AdminAccountRole,
  CreateInternalAccountPayload,
} from '../../data-access/models/account.model';
import { AccountStore } from '../../data-access/store/account.store';

@Component({
  selector: 'app-admin-accounts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    PasswordModule,
    PaginatorModule,
    TableModule,
    TagModule,
    LucideLock,
    LucideRefreshCw,
    LucideSearch,
    LucideShieldCheck,
    LucideUnlock,
    LucideUserCog,
    LucideUserPlus,
    LucideUsers,
    LucideLayoutGrid,
    LucideLayoutList,
    LucideMail,
    LucideUser,
    LucideCalendar,
  ],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.css',
})
export class AccountsComponent implements OnInit {
  protected readonly store = inject(AccountStore);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly AccountDialogMode = AccountDialogMode;
  protected readonly AdminAccountRole = AdminAccountRole;
  protected readonly searchKeyword = signal('');
  protected readonly selectedRoleForEdit = signal<AdminAccountRole>(AdminAccountRole.EMPLOYEE);
  
  protected readonly viewMode = signal<'table' | 'card'>(
    (localStorage.getItem('admin_accounts_view_mode') as 'table' | 'card') || 'card'
  );

  protected readonly roleFilterOptions: AccountRoleOption[] = [
    { label: 'Tất cả vai trò', value: null },
    { label: 'Admin', value: AdminAccountRole.ADMIN },
    { label: 'Owner', value: AdminAccountRole.OWNER },
    { label: 'Manager', value: AdminAccountRole.MANAGER },
    { label: 'Employee', value: AdminAccountRole.EMPLOYEE },
    { label: 'Customer', value: AdminAccountRole.CUSTOMER },
  ];

  protected readonly internalRoleOptions: AccountRoleOption[] = [
    { label: 'Admin', value: AdminAccountRole.ADMIN },
    { label: 'Owner', value: AdminAccountRole.OWNER },
    { label: 'Manager', value: AdminAccountRole.MANAGER },
    { label: 'Employee', value: AdminAccountRole.EMPLOYEE },
  ];

  protected readonly statusOptions: AccountStatusOption[] = [
    { label: 'Tất cả trạng thái', value: AccountActiveFilter.All },
    { label: 'Đang hoạt động', value: AccountActiveFilter.Active },
    { label: 'Đã khóa', value: AccountActiveFilter.Locked },
  ];

  protected readonly createForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: [AdminAccountRole.EMPLOYEE, [Validators.required]],
  });

  protected readonly isCreateDialogVisible = computed(
    () => this.store.dialogMode() === AccountDialogMode.Create
  );

  protected readonly isRoleDialogVisible = computed(
    () => this.store.dialogMode() === AccountDialogMode.EditRole
  );

  ngOnInit(): void {
    this.store.loadAccounts();
  }

  protected handleSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchKeyword.set(input.value);
    this.store.dispatch({ type: AccountEventType.SearchKeywordChanged, keyword: input.value });
    this.store.loadAccounts();
  }

  protected handleRoleFilterChange(role: AdminAccountRole | null): void {
    this.store.dispatch({ type: AccountEventType.RoleFilterChanged, role });
    this.store.loadAccounts();
  }

  protected handleStatusFilterChange(activeFilter: AccountActiveFilter): void {
    this.store.dispatch({ type: AccountEventType.ActiveFilterChanged, activeFilter });
    this.store.loadAccounts();
  }

  protected handlePageChange(event: PaginatorState): void {
    this.store.dispatch({
      type: AccountEventType.PageChanged,
      page: event.page ?? 0,
      size: event.rows ?? this.store.size(),
    });
    this.store.loadAccounts();
  }

  protected openCreateDialog(): void {
    this.createForm.reset({
      email: '',
      fullName: '',
      password: '',
      role: AdminAccountRole.EMPLOYEE,
    });
    this.store.openCreateDialog();
  }

  protected openRoleDialog(account: AccountSummary): void {
    this.selectedRoleForEdit.set(account.role);
    this.store.dispatch({ type: AccountEventType.EditRoleDialogOpened, account });
  }

  protected closeDialog(): void {
    this.store.closeDialog();
  }

  protected submitCreateAccount(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const formValue = this.createForm.getRawValue();
    const payload: CreateInternalAccountPayload = {
      email: formValue.email.trim(),
      fullName: formValue.fullName.trim(),
      password: formValue.password,
      role: formValue.role,
    };

    this.store.createInternalAccount(payload);
  }

  protected submitRoleUpdate(): void {
    const selectedAccount = this.store.selectedAccount();
    if (!selectedAccount) {
      return;
    }

    this.store.updateAccountRole({
      accountId: selectedAccount.id,
      payload: { role: this.selectedRoleForEdit() },
    });
  }

  protected toggleAccountStatus(account: AccountSummary): void {
    this.store.updateAccountStatus({
      accountId: account.id,
      payload: { active: !account.isActive },
    });
  }

  protected refreshAccounts(): void {
    this.store.loadAccounts();
  }

  protected hasControlError(controlName: 'email' | 'fullName' | 'password' | 'role', errorCode: string): boolean {
    const control = this.createForm.controls[controlName];
    return control.hasError(errorCode) && (control.dirty || control.touched);
  }

  protected getAccountInitials(account: AccountSummary): string {
    const name = account.displayName || account.email;
    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
    return initials || 'ZT';
  }

  protected getRoleSeverity(role: AdminAccountRole): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | undefined {
    if (role === AdminAccountRole.OWNER) {
      return 'danger';
    }

    if (role === AdminAccountRole.ADMIN) {
      return undefined;
    }

    if (role === AdminAccountRole.MANAGER) {
      return 'warn';
    }

    if (role === AdminAccountRole.EMPLOYEE) {
      return 'info';
    }

    return 'secondary';
  }

  protected getStatusSeverity(isActive: boolean): 'success' | 'danger' {
    return isActive ? 'success' : 'danger';
  }

  protected getStatusLabel(isActive: boolean): string {
    return isActive ? 'Hoạt động' : 'Đã khóa';
  }

  protected getAvatarUrl(account: AccountSummary): string | null {
    const imageUrl = account.imageUrl;
    if (!imageUrl || imageUrl.trim().length === 0) {
      return null;
    }
    return imageUrl;
  }

  protected toggleViewMode(mode: 'table' | 'card'): void {
    this.viewMode.set(mode);
    localStorage.setItem('admin_accounts_view_mode', mode);
  }

  protected getAvatarGradient(email: string): string {
    if (!email) {
      return 'linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%)';
    }
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
      'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
      'linear-gradient(135deg, #4E65FF 0%, #92EFFD 100%)',
      'linear-gradient(135deg, #76B852 0%, #8DC26F 100%)',
      'linear-gradient(135deg, #F2709C 0%, #FF9472 100%)',
      'linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%)',
      'linear-gradient(135deg, #11998E 0%, #38EF7D 100%)',
      'linear-gradient(135deg, #8A2387 0%, #E94057 100%)',
      'linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    ];
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  }

  protected getActivePercentage(): number {
    const total = this.store.accounts().length;
    if (total === 0) return 0;
    return Math.round((this.store.activeAccountsOnPage() / total) * 100);
  }

  protected getLockedPercentage(): number {
    const total = this.store.accounts().length;
    if (total === 0) return 0;
    return Math.round((this.store.lockedAccountsOnPage() / total) * 100);
  }

  protected getInternalPercentage(): number {
    const total = this.store.accounts().length;
    if (total === 0) return 0;
    return Math.round((this.store.internalAccountsOnPage() / total) * 100);
  }
}
