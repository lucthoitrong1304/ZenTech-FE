import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideEye, LucideEyeOff, LucideKeyRound, LucideLoader2, LucideShieldAlert, LucideShieldCheck } from '@lucide/angular';
import { ChangePasswordRequest } from '../../../auth/data-access/models/auth.models';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { AdminChangePasswordStore } from '../../data-access/store/admin-change-password.store';

enum AdminPasswordField {
  CurrentPassword = 'currentPassword',
  NewPassword = 'newPassword',
  ConfirmPassword = 'confirmPassword',
}

@Component({
  selector: 'app-admin-change-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LucideArrowLeft, LucideEye, LucideEyeOff, LucideKeyRound, LucideLoader2, LucideShieldAlert, LucideShieldCheck],
  templateUrl: './admin-change-password.component.html',
  styleUrl: './admin-change-password.component.css',
})
export class AdminChangePasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authSessionStore = inject(AuthSessionStore);
  protected readonly adminChangePasswordStore = inject(AdminChangePasswordStore);
  protected readonly AdminPasswordField = AdminPasswordField;

  private readonly passwordVisibility = signal<Record<AdminPasswordField, boolean>>({
    [AdminPasswordField.CurrentPassword]: false,
    [AdminPasswordField.NewPassword]: false,
    [AdminPasswordField.ConfirmPassword]: false,
  });

  protected readonly isPasswordSet = computed(() => {
    return this.authSessionStore.currentUser()?.isPasswordSet ?? true;
  });

  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: [''],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator }
  );

  protected getPasswordInputType(field: AdminPasswordField): 'text' | 'password' {
    return this.passwordVisibility()[field] ? 'text' : 'password';
  }

  protected isPasswordVisible(field: AdminPasswordField): boolean {
    return this.passwordVisibility()[field];
  }

  protected togglePasswordVisibility(field: AdminPasswordField): void {
    this.passwordVisibility.update(current => ({
      ...current,
      [field]: !current[field],
    }));
  }

  protected onSubmit(): void {
    if (this.isPasswordSet() && !this.passwordForm.controls.currentPassword.value) {
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

    this.adminChangePasswordStore.changePassword(payload);
    this.passwordForm.reset();
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }
}
