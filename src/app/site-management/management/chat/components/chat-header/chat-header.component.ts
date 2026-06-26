import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideImage, LucideUserRoundCheck, LucideUserRoundCog, LucideX, LucideSearch } from '@lucide/angular';
import { ManagementChatConversation } from '../../data-access/models/management-chat.models';

@Component({
  selector: 'app-chat-header',
  standalone: true,
  imports: [CommonModule, LucideImage, LucideUserRoundCheck, LucideUserRoundCog, LucideX, LucideSearch],
  templateUrl: './chat-header.component.html',
  styleUrl: './chat-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatHeaderComponent {
  readonly conversation = input.required<ManagementChatConversation>();
  readonly mediaDrawerOpen = input.required<boolean>();

  readonly mediaClicked = output<void>();
  readonly searchClicked = output<void>();
  readonly acceptClicked = output<void>();
  readonly transferClicked = output<void>();
  readonly closeClicked = output<void>();

  protected failedImages = new Set<string>();

  protected onImageError(id: string): void {
    this.failedImages.add(id);
  }

  protected isImageFailed(id: string): boolean {
    return this.failedImages.has(id);
  }
}
