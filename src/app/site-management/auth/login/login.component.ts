import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideLoaderCircle,
  LucideLockKeyhole,
  LucideMail,
} from '@lucide/angular';
import { filter } from 'rxjs';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { LoginStore } from '../data-access/store/login.store';
import { AuthShellComponent } from '../shared/auth-shell/auth-shell.component';

@Component({
  selector: 'app-login',
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
    AuthShellComponent,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  providers: [LoginStore],
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly loginStore = inject(LoginStore);
  protected readonly vm$ = this.loginStore.vm$;

  protected readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor() {
    this.loginStore.successMessage$
      .pipe(
        filter((message): message is string => !!message),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(message => {
        this.toastService.success(message);
        this.router.navigate(['/']);
      });

    this.loginStore.errorMessage$
      .pipe(
        filter((message): message is string => !!message),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(message => {
        this.toastService.error(message);
      });
  }

  onLogin(): void {
    this.loginStore.clearMessages();
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid) {
      return;
    }

    const { email, password } = this.loginForm.getRawValue();

    this.loginStore.login({
      email: email.trim(),
      password,
    });
  }

  protected hasControlError(controlName: 'email' | 'password', errorCode: string): boolean {
    const control = this.loginForm.controls[controlName];

    return control.hasError(errorCode) && (control.dirty || control.touched);
  }
}
