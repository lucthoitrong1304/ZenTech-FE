import { Component, ChangeDetectionStrategy } from '@angular/core';
import {
  LucideCircleAlert,
  LucideCircleCheck,
  LucideInfo,
  LucideTriangleAlert,
  LucideX,
} from '@lucide/angular';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    ToastModule,
    LucideCircleCheck,
    LucideCircleAlert,
    LucideTriangleAlert,
    LucideInfo,
    LucideX,
  ],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastComponent {}
