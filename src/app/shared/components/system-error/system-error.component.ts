import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LucideTriangleAlert } from '@lucide/angular';
import { ButtonModule } from 'primeng/button';
import { ErrorState, ErrorStateService } from '../../../core/errors/error-state.service';
import { AuthStorageService } from '../../../core/services/auth-storage.service';
import { Role } from '../../../site-management/auth/data-access/models/auth.enums';
import { hasRole } from '../../../site-management/auth/data-access/utils/auth-role.utils';

@Component({
  selector: 'app-system-error',
  standalone: true,
  imports: [CommonModule, ButtonModule, LucideTriangleAlert],
  templateUrl: './system-error.component.html',
  styleUrls: ['./system-error.component.css'],
})
export class SystemErrorComponent implements OnInit {
  private readonly errorStateService = inject(ErrorStateService);
  private readonly authStorageService = inject(AuthStorageService);
  private readonly router = inject(Router);

  errorData: ErrorState = {
    title: 'Đã có lỗi xảy ra',
    message: 'Hệ thống vừa gặp phải một sự cố không mong muốn. Vui lòng thử lại sau.',
  };

  ngOnInit(): void {
    const currentState = this.errorStateService.getError();
    if (currentState) {
      this.errorData = { ...currentState };
    }
  }

  goHome(): void {
    this.errorStateService.clearError();
    const session = this.authStorageService.getSession();
    if (session && session.roles) {
      const isManagement =
        hasRole(session.roles, Role.OWNER) ||
        hasRole(session.roles, Role.MANAGER) ||
        hasRole(session.roles, Role.EMPLOYEE);

      if (isManagement) {
        this.router.navigate(['/management/dashboard']);
        return;
      }
    }
    this.router.navigate(['/']);
  }
}
