import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ErrorState, ErrorStateService } from '../../../core/errors/error-state.service';

@Component({
  selector: 'app-system-error',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './system-error.component.html',
  styleUrls: ['./system-error.component.css'],
})
export class SystemErrorComponent implements OnInit {
  private readonly errorStateService = inject(ErrorStateService);
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
    this.router.navigate(['/']);
  }
}
