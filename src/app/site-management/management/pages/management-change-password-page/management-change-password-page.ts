import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideKeyRound, LucideShieldAlert, LucideShieldCheck, LucideLoader2 } from '@lucide/angular';
import { ChangePasswordStore } from '../../data-access/store/change-password.store';
import { AuthSessionStore } from '../../../auth/data-access/store/auth-session.store';
import { ChangePasswordRequest } from '../../../auth/data-access/models/auth.models';

@Component({
  selector: 'app-management-change-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideKeyRound, LucideShieldAlert, LucideShieldCheck, LucideLoader2],
  templateUrl: './management-change-password-page.html',
  styleUrl: './management-change-password-page.css',
})
export class ManagementChangePasswordPage {
  private readonly fb = inject(FormBuilder);
  readonly authSessionStore = inject(AuthSessionStore);
  readonly changePasswordStore = inject(ChangePasswordStore);

  readonly isPasswordSet = computed(() => {
    return this.authSessionStore.currentUser()?.isPasswordSet ?? true;
  });

  passwordForm: FormGroup = this.fb.group({
    currentPassword: [''],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  passwordMatchValidator(g: FormGroup) {
    const newPassword = g.get('newPassword')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  onSubmit() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.value;
    const payload: ChangePasswordRequest = {
      newPassword,
      currentPassword: this.isPasswordSet() ? currentPassword : ''
    };

    if (this.isPasswordSet() && !currentPassword) {
      this.passwordForm.get('currentPassword')?.setErrors({ required: true });
      return;
    }

    this.changePasswordStore.changePassword(payload);
  }
}
