import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'error',
    loadComponent: () => import('./shared/components/system-error/system-error.component').then(m => m.SystemErrorComponent)
  }
];
