import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AuthShellComponent } from '../shared/auth-shell/auth-shell.component';

@Component({
  selector: 'app-verification-success',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, AuthShellComponent],
  templateUrl: './verification-success.component.html',
  styleUrls: ['./verification-success.component.css']
})
export class VerificationSuccessComponent {}
