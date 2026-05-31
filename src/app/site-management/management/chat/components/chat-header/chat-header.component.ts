import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideImage, LucidePhone, LucideUserRoundCheck, LucideUserRoundCog, LucideX, LucideSearch } from '@lucide/angular';
import { ManagementChatConversation } from '../../data-access/models/management-chat.models';

@Component({
  selector: 'app-chat-header',
  standalone: true,
  imports: [CommonModule, LucideImage, LucidePhone, LucideUserRoundCheck, LucideUserRoundCog, LucideX, LucideSearch],
  templateUrl: './chat-header.component.html',
  styleUrl: './chat-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatHeaderComponent {
  readonly conversation = input.required<ManagementChatConversation>();
  readonly mediaDrawerOpen = input.required<boolean>();
  readonly canCall = input(false);

  readonly mediaClicked = output<void>();
  readonly searchClicked = output<void>();
  readonly callClicked = output<void>();
  readonly acceptClicked = output<void>();
  readonly transferClicked = output<void>();
  readonly closeClicked = output<void>();
}
