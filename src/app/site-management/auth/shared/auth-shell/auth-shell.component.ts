import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './auth-shell.component.html',
  styleUrl: './auth-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthShellComponent {
  readonly layout = input<'stack' | 'split'>('stack');
  readonly showBrand = input(true);
  readonly showFooter = input(true);
  readonly visualImage = input<string | null>(null);
  readonly visualAlt = input('ZenTech visual');
}
