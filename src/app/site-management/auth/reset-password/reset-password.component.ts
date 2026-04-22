import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideLoaderCircle,
  LucideLockKeyhole,
  LucideShieldCheck,
} from '@lucide/angular';
import { filter } from 'rxjs';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { PasswordRecoveryStore } from '../data-access/store/password-recovery.store';
import { AuthShellComponent } from '../shared/auth-shell/auth-shell.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    LucideArrowRight,
    LucideLoaderCircle,
    LucideLockKeyhole,
    LucideShieldCheck,
    AuthShellComponent,
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
  providers: [PasswordRecoveryStore],
})
export class ResetPasswordComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly passwordRecoveryStore = inject(PasswordRecoveryStore);
  protected readonly vm$ = this.passwordRecoveryStore.vm$;

  protected readonly token = this.route.snapshot.queryParamMap.get('token')?.trim() || '';
  protected readonly resetPasswordForm = this.formBuilder.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [passwordMatchValidator],
    }
  );

  constructor() {
    if (!this.token) {
      this.toastService.error('Link khôi phục không hợp lệ hoặc thiếu token.');
    }

    this.passwordRecoveryStore.successMessage$
      .pipe(
        filter((message): message is string => !!message),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(message => {
        this.toastService.success(message);
        this.router.navigate(['/auth/login']);
      });

    this.passwordRecoveryStore.errorMessage$
      .pipe(
        filter((message): message is string => !!message),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(message => {
        this.toastService.error(message);
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
    errorCode: string
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
