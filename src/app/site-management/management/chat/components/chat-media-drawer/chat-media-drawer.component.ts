import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideDownload, LucideFileText, LucideImage, LucideLink, LucidePlayCircle } from '@lucide/angular';
import { DrawerModule } from 'primeng/drawer';
import {
  ManagementChatMediaItem,
  ManagementChatMediaTab,
} from '../../data-access/models/management-chat.models';

interface MediaTabOption {
  value: ManagementChatMediaTab;
  label: string;
}

const MEDIA_TABS: MediaTabOption[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'MEDIA', label: 'Hình ảnh/Video' },
  { value: 'FILES', label: 'Tệp tin' },
  { value: 'LINKS', label: 'Liên kết' },
];

@Component({
  selector: 'app-chat-media-drawer',
  standalone: true,
  imports: [
    CommonModule,
    DrawerModule,
    LucideDownload,
    LucideFileText,
    LucideImage,
    LucideLink,
    LucidePlayCircle,
  ],
  templateUrl: './chat-media-drawer.component.html',
  styleUrl: './chat-media-drawer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMediaDrawerComponent {
  readonly open = input.required<boolean>();
  readonly activeTab = input.required<ManagementChatMediaTab>();
  readonly mediaItems = input.required<ManagementChatMediaItem[]>();

  readonly openChanged = output<boolean>();
  readonly closed = output<void>();
  readonly tabSelected = output<ManagementChatMediaTab>();

  protected readonly tabs = MEDIA_TABS;

  protected onVisibleChange(open: boolean): void {
    this.openChanged.emit(open);

    if (!open) {
      this.closed.emit();
    }
  }

  protected isMediaItem(item: ManagementChatMediaItem): boolean {
    return item.type === 'IMAGE' || item.type === 'VIDEO';
  }
}
