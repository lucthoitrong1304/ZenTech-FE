import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideArrowLeft } from '@lucide/angular';
import {
  ManagementChatExpertRequestCount,
  ManagementChatExpertRequestFilter,
  ManagementChatStatusCount,
  ManagementChatStatusFilter,
} from '../../data-access/models/management-chat.models';

@Component({
  selector: 'app-chat-filter-sidebar',
  standalone: true,
  imports: [CommonModule, LucideArrowLeft],
  templateUrl: './chat-filter-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatFilterSidebarComponent {
  readonly statusCounts = input.required<ManagementChatStatusCount[]>();
  readonly expertRequestCounts = input.required<ManagementChatExpertRequestCount[]>();
  readonly activeStatus = input.required<ManagementChatStatusFilter>();
  readonly activeExpertRequest = input.required<ManagementChatExpertRequestFilter>();

  readonly statusSelected = output<ManagementChatStatusFilter>();
  readonly expertRequestSelected = output<ManagementChatExpertRequestFilter>();
  readonly adminSidebarRequested = output<void>();
}
