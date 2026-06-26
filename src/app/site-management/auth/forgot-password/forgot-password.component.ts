import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideLoader2, LucideMail } from '@lucide/angular';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { PasswordRecoveryStore } from '../data-access/store/password-recovery.store';
import { AuthShellComponent } from '../shared/auth-shell/auth-shell.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    LucideArrowRight,
    LucideLoader2,
    LucideMail,
    AuthShellComponent,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
  providers: [PasswordRecoveryStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly toastService = inject(ToastService);
  protected readonly passwordRecoveryStore = inject(PasswordRecoveryStore);

  protected readonly forgotPasswordForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    effect(() => {
      const message = this.passwordRecoveryStore.successMessage();

      if (message) {
        untracked(() => this.toastService.success(message));
      }
    });

    effect(() => {
      const message = this.passwordRecoveryStore.errorMessage();

      if (message) {
        untracked(() => this.toastService.error(message));
      }
    });
  }

  onSendRecoveryEmail(): void {
    this.passwordRecoveryStore.clearMessages();
    this.forgotPasswordForm.markAllAsTouched();

    if (this.forgotPasswordForm.invalid) {
      return;
    }

    const { email } = this.forgotPasswordForm.getRawValue();

    this.passwordRecoveryStore.forgotPassword({
      email: email.trim(),
    });
  }

  protected hasControlError(errorCode: string): boolean {
    const control = this.forgotPasswordForm.controls.email;

    return control.hasError(errorCode) && (control.dirty || control.touched);
  }
}
