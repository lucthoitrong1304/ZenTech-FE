import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowRight, LucideEye, LucideEyeOff, LucideMail, LucideUser } from '@lucide/angular';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { RegisterStore } from '../data-access/store/register.store';
import { AuthShellComponent } from '../shared/auth-shell/auth-shell.component';

@Component({
  selector: 'app-register',
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
    LucideMail,
    LucideUser,
    AuthShellComponent,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  providers: [RegisterStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  protected readonly registerStore = inject(RegisterStore);
  protected readonly passwordVisibility = signal({ password: false, confirmPassword: false });

  protected togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    this.passwordVisibility.update((visibility) => ({
      ...visibility,
      [field]: !visibility[field],
    }));
  }

  protected readonly registerForm = this.formBuilder.nonNullable.group(
    {
      fullName: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [passwordMatchValidator],
    },
  );

  constructor() {
    effect(() => {
      const message = this.registerStore.successMessage();

      if (message) {
        untracked(() => {
          this.registerStore.clearMessages();
          this.toastService.success(message);
          this.router.navigate(['/auth/login']);
        });
      }
    });

    effect(() => {
      const message = this.registerStore.errorMessage();

      if (message) {
        untracked(() => this.toastService.error(message));
      }
    });
  }

  onRegister(): void {
    this.registerStore.clearMessages();
    this.registerForm.markAllAsTouched();

    if (this.registerForm.invalid) {
      return;
    }

    const { email, fullName, password } = this.registerForm.getRawValue();

    this.registerStore.register({
      email: email.trim(),
      fullName: fullName.trim(),
      password,
    });
  }

  protected hasControlError(
    controlName: 'email' | 'password' | 'confirmPassword',
    errorCode: string,
  ): boolean {
    const control = this.registerForm.controls[controlName];

    return control.hasError(errorCode) && (control.dirty || control.touched);
  }

  protected hasPasswordMismatchError(): boolean {
    const confirmPasswordControl = this.registerForm.controls.confirmPassword;

    return (
      this.registerForm.hasError('passwordMismatch') &&
      (confirmPasswordControl.dirty || confirmPasswordControl.touched)
    );
  }
}

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword || password === confirmPassword) {
    return null;
  }

  return { passwordMismatch: true };
}
