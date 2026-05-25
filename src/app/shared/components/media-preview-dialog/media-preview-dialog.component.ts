import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideX } from '@lucide/angular';
import { DialogModule } from 'primeng/dialog';
import { MediaPreviewItem } from './media-preview-dialog.model';

@Component({
  selector: 'app-media-preview-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, LucideX],
  templateUrl: './media-preview-dialog.component.html',
  styleUrl: './media-preview-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaPreviewDialogComponent {
  readonly item = input<MediaPreviewItem | null>(null);
  readonly closed = output<void>();

  protected onVisibleChange(visible: boolean): void {
    if (!visible) {
      this.closed.emit();
    }
  }
}
