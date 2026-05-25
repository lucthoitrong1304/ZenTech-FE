import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  LucideArrowLeft,
  LucideDownload,
  LucideExternalLink,
  LucideFileText,
  LucideImage,
  LucideLink,
  LucidePlayCircle,
  LucideSearch,
  LucideX,
} from '@lucide/angular';
import { MediaPreviewItem } from '../../../../shared/components/media-preview-dialog/media-preview-dialog.model';
import {
  CustomerChatSharedItem,
  CustomerChatSharedTab,
} from '../../data-access/models/customer-chat.models';

interface SharedTabOption {
  value: CustomerChatSharedTab;
  label: string;
  count: number;
}

type SharedSidebarMode = 'compact' | 'expanded';

@Component({
  selector: 'app-customer-shared-content-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    LucideArrowLeft,
    LucideDownload,
    LucideExternalLink,
    LucideFileText,
    LucideImage,
    LucideLink,
    LucidePlayCircle,
    LucideSearch,
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
  readonly mode = input<SharedSidebarMode>('compact');
  readonly mediaCount = input(0);
  readonly fileCount = input(0);
  readonly linkCount = input(0);
  readonly tabSelected = output<CustomerChatSharedTab>();
  readonly closed = output<void>();
  readonly previewRequested = output<MediaPreviewItem>();

  protected tabs(): SharedTabOption[] {
    const compactTabs: SharedTabOption[] = [
      { value: 'MEDIA', label: 'Media', count: this.mediaCount() },
      { value: 'FILES', label: 'Tep', count: this.fileCount() },
      { value: 'LINKS', label: 'Links', count: this.linkCount() },
    ];

    if (this.mode() === 'compact') {
      return compactTabs;
    }

    return [{ value: 'ALL', label: 'All', count: this.items().length }, ...compactTabs];
  }

  protected isMedia(item: CustomerChatSharedItem): boolean {
    return item.type === 'IMAGE' || item.type === 'VIDEO';
  }

  protected requestPreview(item: CustomerChatSharedItem): void {
    if (!this.isMedia(item)) {
      return;
    }

    this.previewRequested.emit({
      type: item.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      title: item.title,
      url: item.url,
    });
  }

  protected mediaItems(): CustomerChatSharedItem[] {
    return this.items().filter(item => this.isMedia(item));
  }

  protected fileItems(): CustomerChatSharedItem[] {
    return this.items().filter(item => item.type === 'FILE');
  }

  protected linkItems(): CustomerChatSharedItem[] {
    return this.items().filter(item => item.type === 'LINK');
  }
}
