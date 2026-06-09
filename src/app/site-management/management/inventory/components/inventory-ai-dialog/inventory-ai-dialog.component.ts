import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { MarkdownComponent } from 'ngx-markdown';
import {
  LucideX,
  LucideCpu,
  LucideSparkles,
} from '@lucide/angular';

@Component({
  selector: 'app-inventory-ai-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    MarkdownComponent,
    LucideX,
    LucideCpu,
    LucideSparkles,
  ],
  templateUrl: './inventory-ai-dialog.component.html',
  styleUrl: './inventory-ai-dialog.component.css',
})
export class InventoryAiDialogComponent {
  visible = input.required<boolean>();
  loading = input<boolean>(false);
  content = input<string | null>(null);

  close = output<void>();
}
