import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  ViewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideEye,
  LucideEyeOff,
  LucideMail,
  LucideLoader2,
} from '@lucide/angular';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Role } from '../data-access/models/auth.enums';
import { AuthSessionStore } from '../data-access/store/auth-session.store';
import { LoginStore } from '../data-access/store/login.store';
import { hasRole } from '../data-access/utils/auth-role.utils';
import { AuthShellComponent } from '../shared/auth-shell/auth-shell.component';

// Khai báo để Angular không báo lỗi compile khi dùng SDK window.google
declare const google: any;

// @ts-ignore
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
    LucideEye,
    LucideEyeOff,
    LucideMail,
    AuthShellComponent,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  providers: [LoginStore],
})
export class LoginComponent implements AfterViewInit {
  // Lấy reference của div phủ tàng hình
  @ViewChild('googleBtnContainer', { static: false }) googleBtnContainer!: ElementRef;

  // Inject các store và service
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly authSessionStore = inject(AuthSessionStore);
  protected readonly loginStore = inject(LoginStore);
  protected readonly isPasswordVisible = signal(false);

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
  ngAfterViewInit(): void {
    this.initGoogleIdentityServices();
  }

  private initGoogleIdentityServices(): void {
    // Đảm bảo script của Google đã được load thành công vào window
    if (typeof google !== 'undefined') {
      // 1. Khởi tạo cấu hình nhận diện với Client ID của ông
      google.accounts.id.initialize({
        client_id: '172722848021-38o0a01f8t8lhpug43i6fa93f4c4daau.apps.googleusercontent.com',
        callback: (response: any) => {
          if (response.credential) {
            // 2. Khi user click, Google trả Token về -> gọi Store xử lý ngay
            this.loginStore.loginWithGoogle(response.credential);
          }
        },
      });

      // 3. Render cái nút thật sự của Google vào container tàng hình
      google.accounts.id.renderButton(this.googleBtnContainer.nativeElement, {
        theme: 'outline',
        size: 'large',
        // Đặt chiều rộng bằng hoặc lớn hơn nút custom để phủ trọn vẹn diện tích click
        width: this.googleBtnContainer.nativeElement.offsetWidth || 380,
        text: 'signin_with',
      });
    } else {
      // Dự phòng trường hợp mạng chậm chưa load kịp script
      setTimeout(() => this.initGoogleIdentityServices(), 500);
    }
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

    return resolvePostLoginRoute(roles, this.route.snapshot.queryParamMap.get('returnUrl'));
  }
}

export function resolvePostLoginRoute(roles: string[], returnUrl: string | null): string {
  if (hasRole(roles, Role.ADMIN)) {
    return '/admin/dashboard';
  }
  return hasRole(roles, Role.OWNER) || hasRole(roles, Role.MANAGER) || hasRole(roles, Role.EMPLOYEE)
    ? '/management/dashboard'
    : getSafeReturnUrl(returnUrl);
}

export function getSafeReturnUrl(returnUrl: string | null): string {
  if (
    !returnUrl ||
    !returnUrl.startsWith('/') ||
    returnUrl.startsWith('//') ||
    returnUrl.includes('://')
  ) {
    return '/';
  }

  return returnUrl;
}
