import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideArrowRight, LucideEye, LucideEyeOff } from '@lucide/angular';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { PasswordRecoveryStore } from '../data-access/store/password-recovery.store';
import { AuthShellComponent } from '../shared/auth-shell/auth-shell.component';

const PASSWORD_COMPLEXITY_PATTERN = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{6,}$/;

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    LucideArrowRight,
    LucideEye,
    LucideEyeOff,
    AuthShellComponent,
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
  providers: [PasswordRecoveryStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  protected readonly passwordRecoveryStore = inject(PasswordRecoveryStore);
  protected readonly passwordVisibility = signal({ newPassword: false, confirmPassword: false });

  protected togglePasswordVisibility(field: 'newPassword' | 'confirmPassword'): void {
    this.passwordVisibility.update((visibility) => ({
      ...visibility,
      [field]: !visibility[field],
    }));
  }

  protected readonly token = this.route.snapshot.queryParamMap.get('token')?.trim() || '';
  protected readonly resetPasswordForm = this.formBuilder.nonNullable.group(
    {
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.pattern(PASSWORD_COMPLEXITY_PATTERN),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [passwordMatchValidator],
    },
  );

  constructor() {
    if (!this.token) {
      this.toastService.error('Link khôi phục không hợp lệ hoặc thiếu token.');
    }

    effect(() => {
      const message = this.passwordRecoveryStore.successMessage();

      if (message) {
        untracked(() => {
          this.passwordRecoveryStore.clearMessages();
          this.toastService.success(message);
          this.router.navigate(['/auth/login']);
        });
      }
    });

    effect(() => {
      const message = this.passwordRecoveryStore.errorMessage();

      if (message) {
        untracked(() => this.toastService.error(message));
      }
    });
  }

  onResetPassword(): void {
    this.passwordRecoveryStore.clearMessages();
    this.resetPasswordForm.markAllAsTouched();

    if (!this.token || this.resetPasswordForm.invalid) {
      return;
    }

    const { newPassword } = this.resetPasswordForm.getRawValue();

    this.passwordRecoveryStore.resetPassword({
      token: this.token,
      newPassword,
    });
  }

  protected hasControlError(
    controlName: 'newPassword' | 'confirmPassword',
    errorCode: string,
  ): boolean {
    const control = this.resetPasswordForm.controls[controlName];

    return control.hasError(errorCode) && (control.dirty || control.touched);
  }

  protected hasPasswordMismatchError(): boolean {
    const confirmPasswordControl = this.resetPasswordForm.controls.confirmPassword;

    return (
      this.resetPasswordForm.hasError('passwordMismatch') &&
      (confirmPasswordControl.dirty || confirmPasswordControl.touched)
    );
  }
}

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword || password === confirmPassword) {
    return null;
  }

  return { passwordMismatch: true };
}
