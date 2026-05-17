import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideBot } from '@lucide/angular';
import {
  OwnerChatConversation,
  OwnerChatMessage,
} from '../../data-access/models/owner-chat.models';

@Component({
  selector: 'app-message-timeline',
  standalone: true,
  imports: [CommonModule, LucideBot],
  templateUrl: './message-timeline.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageTimelineComponent {
  readonly conversation = input.required<OwnerChatConversation>();
  readonly messages = input.required<OwnerChatMessage[]>();
}
