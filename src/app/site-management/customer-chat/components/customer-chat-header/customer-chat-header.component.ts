import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideImages, LucideMaximize2, LucideMinus, LucideSparkles } from '@lucide/angular';
import {
  CustomerChatParticipant,
  CustomerChatProductContext,
} from '../../data-access/models/customer-chat.models';

@Component({
  selector: 'app-customer-chat-header',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideImages, LucideMaximize2, LucideMinus, LucideSparkles],
  templateUrl: './customer-chat-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerChatHeaderComponent {
  readonly staff = input<CustomerChatParticipant | null>(null);
  readonly product = input<CustomerChatProductContext | null>(null);
  readonly compact = input(false);
  readonly sharedSidebarOpen = input(false);
  readonly closeClicked = output<void>();
  readonly sharedClicked = output<void>();
}
