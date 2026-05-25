import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideBot } from '@lucide/angular';
import {
  ManagementChatConversation,
  ManagementChatMessage,
} from '../../data-access/models/management-chat.models';

@Component({
  selector: 'app-message-timeline',
  standalone: true,
  imports: [CommonModule, LucideBot],
  templateUrl: './message-timeline.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageTimelineComponent {
  readonly conversation = input.required<ManagementChatConversation>();
  readonly messages = input.required<ManagementChatMessage[]>();
}
