import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideBot, LucideFileText, LucideImage, LucideUserRound } from '@lucide/angular';
import {
  CustomerChatMessage,
  CustomerChatParticipant,
} from '../../data-access/models/customer-chat.models';

@Component({
  selector: 'app-customer-message-timeline',
  standalone: true,
  imports: [CommonModule, LucideBot, LucideFileText, LucideImage, LucideUserRound],
  templateUrl: './customer-message-timeline.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerMessageTimelineComponent {
  readonly messages = input.required<CustomerChatMessage[]>();
  readonly customer = input<CustomerChatParticipant | null>(null);
  readonly staff = input<CustomerChatParticipant | null>(null);
  readonly compact = input(false);
}
