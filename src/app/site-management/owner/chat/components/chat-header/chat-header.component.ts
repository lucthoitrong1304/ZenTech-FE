import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideImage, LucideUserRoundCheck, LucideUserRoundCog, LucideX } from '@lucide/angular';
import { OwnerChatConversation } from '../../data-access/models/owner-chat.models';

@Component({
  selector: 'app-chat-header',
  standalone: true,
  imports: [CommonModule, LucideImage, LucideUserRoundCheck, LucideUserRoundCog, LucideX],
  templateUrl: './chat-header.component.html',
  styleUrl: './chat-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatHeaderComponent {
  readonly conversation = input.required<OwnerChatConversation>();
  readonly mediaDrawerOpen = input.required<boolean>();

  readonly mediaClicked = output<void>();
  readonly acceptClicked = output<void>();
  readonly transferClicked = output<void>();
  readonly closeClicked = output<void>();
}
