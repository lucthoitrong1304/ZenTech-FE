import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, computed, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import {
  LucideChevronRight,
  LucideMapPin,
  LucidePencil,
  LucideWallet,
  LucideUpload,
} from '@lucide/angular';
import { AccountStore } from '../../data-access/store/account.store';
import { ChangePasswordRequest } from '../../../auth/data-access/models/auth.models';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { ChangePasswordStore } from '../../../management/data-access/store/change-password.store';

@Component({
  selector: 'app-account-overview-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    DialogModule,
    LucideWallet,
    LucideChevronRight,
    LucideMapPin,
    LucidePencil,
    LucideUpload,
  ],
  templateUrl: './account-overview-page.component.html',
})
export class AccountOverviewPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authSessionStore = inject(AuthSessionStore);
  protected readonly accountStore = inject(AccountStore);
  protected readonly changePasswordStore = inject(ChangePasswordStore);

  protected isEditProfileOpen = false;
  protected editFullName = '';
  protected isChangePasswordOpen = false;
  protected readonly isPasswordSet = computed(() => {
    return this.authSessionStore.currentUser()?.isPasswordSet ?? true;
  });
  protected readonly passwordForm = this.formBuilder.nonNullable.group(
    {
      currentPassword: [''],
      newPassword: ['', [Validators.required, Validators.minLength(6), passwordComplexityValidator]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator }
  );

  private readonly closeChangePasswordOnSuccess = effect(() => {
    const lastSuccessAt = this.changePasswordStore.lastSuccessAt();
    if (lastSuccessAt && this.isChangePasswordOpen) {
      this.closeChangePasswordDialog();
    }
  });

  protected orderStatusLabel(status: string): string {
    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'CREATED':
        return 'Mới tạo';
      case 'PENDING':
        return 'Chờ thanh toán';
      case 'PROCESSING':
        return 'Đang xử lý';
      case 'SHIPPED':
        return 'Đang giao hàng';
      case 'DELIVERED':
        return 'Đã giao hàng';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status;
    }
  }

  protected statusClass(status: string): string {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
      case 'processing':
        return 'bg-[#ffdf94] text-[#6e5400]';
      case 'cancelled':
        return 'bg-[#ffdad6] text-[#93000a]';
      case 'delivered':
        return 'bg-[#d8f5dd] text-[#166534]';
      case 'shipped':
      default:
        return 'bg-[#e2dfff] text-[#3323cc]';
    }
  }

  protected openEditProfile(): void {
    const profile = this.accountStore.profile();
    if (profile) {
      this.editFullName = profile.fullName;
      this.isEditProfileOpen = true;
    }
  }

  protected saveProfile(): void {
    if (!this.editFullName.trim()) {
      return;
    }
    const profile = this.accountStore.profile();
    this.accountStore.updateProfile({
      fullName: this.editFullName,
      imageUrl: profile?.imageUrl,
    });
    this.isEditProfileOpen = false;
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.accountStore.uploadAvatar({ file });
    }
  }

  protected openChangePasswordDialog(): void {
    this.passwordForm.reset();
    this.isChangePasswordOpen = true;
  }

  protected closeChangePasswordDialog(): void {
    this.isChangePasswordOpen = false;
    this.passwordForm.reset();
  }

  protected changePassword(): void {
    if (this.isPasswordSet() && !this.passwordForm.controls.currentPassword.value.trim()) {
      this.passwordForm.controls.currentPassword.setErrors({ required: true });
    }

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const value = this.passwordForm.getRawValue();
    const payload: ChangePasswordRequest = {
      currentPassword: this.isPasswordSet() ? value.currentPassword : '',
      newPassword: value.newPassword,
    };

    this.changePasswordStore.changePassword(payload);
  }

  protected hasPasswordControlError(
    controlName: 'currentPassword' | 'newPassword' | 'confirmPassword',
    errorCode: string
  ): boolean {
    const control = this.passwordForm.controls[controlName];
    return control.touched && control.hasError(errorCode);
  }

  protected hasPasswordMismatchError(): boolean {
    return (
      this.passwordForm.controls.confirmPassword.touched &&
      this.passwordForm.hasError('passwordMismatch')
    );
  }

  protected isChangePasswordSubmitDisabled(): boolean {
    return (
      this.changePasswordStore.isSaving() ||
      this.passwordForm.invalid ||
      (this.isPasswordSet() && !this.passwordForm.controls.currentPassword.value.trim())
    );
  }
}

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!newPassword || !confirmPassword || newPassword === confirmPassword) {
    return null;
  }

  return { passwordMismatch: true };
}

function passwordComplexityValidator(control: AbstractControl): ValidationErrors | null {
  const password = String(control.value || '');

  if (!password) {
    return null;
  }

  const errors: ValidationErrors = {};

  if (!/[A-Z]/.test(password)) {
    errors['uppercase'] = true;
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors['specialCharacter'] = true;
  }

  return Object.keys(errors).length ? errors : null;
}
