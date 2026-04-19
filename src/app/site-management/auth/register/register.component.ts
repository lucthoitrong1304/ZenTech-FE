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
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideLoaderCircle,
  LucideLockKeyhole,
  LucideMail,
  LucideShieldCheck,
  LucideUser,
} from '@lucide/angular';
import { filter } from 'rxjs';
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
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    LucideArrowRight,
    LucideLoaderCircle,
    LucideLockKeyhole,
    LucideMail,
    LucideShieldCheck,
    LucideUser,
    AuthShellComponent,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  providers: [RegisterStore],
})
export class RegisterComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly registerStore = inject(RegisterStore);
  protected readonly vm$ = this.registerStore.vm$;

  protected readonly registerForm = this.formBuilder.nonNullable.group(
    {
      fullName: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [passwordMatchValidator],
    }
  );

  constructor() {
    this.registerStore.successMessage$
      .pipe(
        filter((message): message is string => !!message),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(message => {
        this.toastService.success(message);
        this.router.navigate(['/auth/login']);
      });

    this.registerStore.errorMessage$
      .pipe(
        filter((message): message is string => !!message),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(message => {
        this.toastService.error(message);
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
    errorCode: string
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
