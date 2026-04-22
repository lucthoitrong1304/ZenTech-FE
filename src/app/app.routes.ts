import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '', // Home route pattern
    loadComponent: () => import('./site-management/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./site-management/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'auth',
    children: [
      { path: 'login', loadComponent: () => import('./site-management/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./site-management/auth/register/register.component').then(m => m.RegisterComponent) },
      { path: 'forgot-password', loadComponent: () => import('./site-management/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
      { path: 'reset-password', loadComponent: () => import('./site-management/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) }
    ]
  },
  { // Keep global error route untouched
    path: 'error',
    loadComponent: () => import('./shared/components/system-error/system-error.component').then(m => m.SystemErrorComponent)
  }
];
