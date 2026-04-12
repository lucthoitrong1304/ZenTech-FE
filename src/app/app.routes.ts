import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '', // Home route pattern
    loadComponent: () => import('./site-management/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'auth',
    children: [
      { path: 'login', loadComponent: () => import('./site-management/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./site-management/auth/register/register.component').then(m => m.RegisterComponent) },
      { path: 'forgot-password', loadComponent: () => import('./site-management/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
      { path: 'verify-otp', loadComponent: () => import('./site-management/auth/verify-otp/verify-otp.component').then(m => m.VerifyOtpComponent) },
      { path: 'verification-success', loadComponent: () => import('./site-management/auth/verification-success/verification-success.component').then(m => m.VerificationSuccessComponent) }
    ]
  },
  { // Keep global error route untouched
    path: 'error',
    loadComponent: () => import('./shared/components/system-error/system-error.component').then(m => m.SystemErrorComponent)
  }
];
