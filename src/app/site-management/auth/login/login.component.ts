import { CommonModule } from '@angular/common';
import { Component, effect, inject, untracked, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideLockKeyhole,
  LucideMail,
  LucideLoader2, LucideLoaderCircle
} from '@lucide/angular';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Role } from '../data-access/models/auth.enums';
import { AuthSessionStore } from '../data-access/store/auth-session.store';
import { LoginStore } from '../data-access/store/login.store';
import { hasRole } from '../data-access/utils/auth-role.utils';
import { AuthShellComponent } from '../shared/auth-shell/auth-shell.component';
import { SocialAuthService, GoogleSigninButtonModule } from '@abacritt/angularx-social-login';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
    LucideLoaderCircle,
    GoogleSigninButtonModule,
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

  private readonly socialAuthService = inject(SocialAuthService);

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

    // 2. Lắng nghe kết quả trả về từ Google khi người dùng chọn tài khoản xong
    // Thêm pipe(takeUntilDestroyed()) trước khi subscribe
    this.socialAuthService.authState
      .pipe(takeUntilDestroyed())
      .subscribe((user) => {
        if (user && user.idToken) {
          this.loginStore.loginWithGoogle({ token: user.idToken });
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

  protected showGoogleButton = false;
  private readonly cdr = inject(ChangeDetectorRef);
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.showGoogleButton = true;
      this.cdr.detectChanges();
    }, 0);
  }
}
