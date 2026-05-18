import { CommonModule } from '@angular/common';
import { Component, effect, inject, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideLockKeyhole,
  LucideMail,
  LucideLoader2
} from '@lucide/angular';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Role } from '../data-access/models/auth.enums';
import { AuthSessionStore } from '../data-access/store/auth-session.store';
import { LoginStore } from '../data-access/store/login.store';
import { hasRole } from '../data-access/utils/auth-role.utils';
import { AuthShellComponent } from '../shared/auth-shell/auth-shell.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    LucideLoader2,
    LucideArrowRight,
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
  private readonly authSessionStore = inject(AuthSessionStore);
  protected readonly loginStore = inject(LoginStore);

  protected readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor() {
    effect(() => {
      const message = this.loginStore.successMessage();

      if (message) {
        untracked(() => {
          this.loginStore.clearMessages();
          this.toastService.success(message);
          this.router.navigate([this.getPostLoginRoute()]);
        });
      }
    });

    effect(() => {
      const message = this.loginStore.errorMessage();

      if (message) {
        untracked(() => this.toastService.error(message));
      }
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

  private getPostLoginRoute(): string {
    const roles = this.authSessionStore.currentUser()?.roles || [];

    return hasRole(roles, Role.OWNER) ? '/owner/dashboard' : '/';
  }
}
