import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthShellComponent } from '../shared/auth-shell/auth-shell.component';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, MatButtonModule, AuthShellComponent],
  templateUrl: './verify-otp.component.html',
  styleUrls: ['./verify-otp.component.css']
})
export class VerifyOtpComponent {
  constructor(private readonly router: Router) {}

  onVerify(): void {
    this.router.navigate(['/auth/verification-success']);
  }
}
