import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideLoaderCircle, LucideMail } from '@lucide/angular';
import { filter } from 'rxjs';
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
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    LucideArrowRight,
    LucideLoaderCircle,
    LucideMail,
    AuthShellComponent,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
  providers: [PasswordRecoveryStore],
})
export class ForgotPasswordComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly passwordRecoveryStore = inject(PasswordRecoveryStore);
  protected readonly vm$ = this.passwordRecoveryStore.vm$;

  protected readonly forgotPasswordForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    this.passwordRecoveryStore.successMessage$
      .pipe(
        filter((message): message is string => !!message),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(message => {
        this.toastService.success(message);
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
