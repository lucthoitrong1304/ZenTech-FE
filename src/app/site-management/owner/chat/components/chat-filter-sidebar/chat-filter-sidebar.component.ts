import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideArrowLeft } from '@lucide/angular';
import {
  OwnerChatExpertRequestCount,
  OwnerChatExpertRequestFilter,
  OwnerChatStatusCount,
  OwnerChatStatusFilter,
} from '../../data-access/models/owner-chat.models';

@Component({
  selector: 'app-chat-filter-sidebar',
  standalone: true,
  imports: [CommonModule, LucideArrowLeft],
  templateUrl: './chat-filter-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatFilterSidebarComponent {
  readonly statusCounts = input.required<OwnerChatStatusCount[]>();
  readonly expertRequestCounts = input.required<OwnerChatExpertRequestCount[]>();
  readonly activeStatus = input.required<OwnerChatStatusFilter>();
  readonly activeExpertRequest = input.required<OwnerChatExpertRequestFilter>();

  readonly statusSelected = output<OwnerChatStatusFilter>();
  readonly expertRequestSelected = output<OwnerChatExpertRequestFilter>();
  readonly adminSidebarRequested = output<void>();
}
