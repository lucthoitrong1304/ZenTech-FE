import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  LucideDownload,
  LucideExternalLink,
  LucideFileText,
  LucideImage,
  LucideLink,
  LucidePlayCircle,
  LucideX,
} from '@lucide/angular';
import {
  CustomerChatSharedItem,
  CustomerChatSharedTab,
} from '../../data-access/models/customer-chat.models';

interface SharedTabOption {
  value: CustomerChatSharedTab;
  label: string;
  count: number;
}

@Component({
  selector: 'app-customer-shared-content-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    LucideDownload,
    LucideExternalLink,
    LucideFileText,
    LucideImage,
    LucideLink,
    LucidePlayCircle,
    LucideX,
  ],
  templateUrl: './customer-shared-content-sidebar.component.html',
  styleUrl: './customer-shared-content-sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerSharedContentSidebarComponent {
  readonly open = input.required<boolean>();
  readonly activeTab = input.required<CustomerChatSharedTab>();
  readonly items = input.required<CustomerChatSharedItem[]>();
  readonly mediaCount = input(0);
  readonly fileCount = input(0);
  readonly linkCount = input(0);
  readonly tabSelected = output<CustomerChatSharedTab>();
  readonly closed = output<void>();

  protected tabs(): SharedTabOption[] {
    return [
      { value: 'MEDIA', label: 'Media', count: this.mediaCount() },
      { value: 'FILES', label: 'Tệp', count: this.fileCount() },
      { value: 'LINKS', label: 'Links', count: this.linkCount() },
    ];
  }

  protected isMedia(item: CustomerChatSharedItem): boolean {
    return item.type === 'IMAGE' || item.type === 'VIDEO';
  }
}
