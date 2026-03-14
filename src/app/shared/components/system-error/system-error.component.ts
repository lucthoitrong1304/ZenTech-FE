import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ErrorStateService, ErrorState } from '../../../core/services/error-state.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-system-error',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './system-error.component.html',
  styleUrls: ['./system-error.component.css']
})
export class SystemErrorComponent implements OnInit {
  private errorStateService = inject(ErrorStateService);
  private router = inject(Router);

  errorData: ErrorState = {
    title: 'Đã có lỗi xảy ra',
    message: 'Hệ thống vừa gặp phải một sự cố không mong muốn. Vui lòng thử lại sau.'
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
