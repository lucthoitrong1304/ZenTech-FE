import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideDownload, LucideFileText, LucideImage, LucideLink, LucidePlayCircle } from '@lucide/angular';
import { DrawerModule } from 'primeng/drawer';
import { MediaPreviewItem } from '../../../../../shared/components/media-preview-dialog/media-preview-dialog.model';
import {
  OwnerChatMediaItem,
  OwnerChatMediaTab,
} from '../../data-access/models/owner-chat.models';

interface MediaTabOption {
  value: OwnerChatMediaTab;
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
  readonly activeTab = input.required<OwnerChatMediaTab>();
  readonly mediaItems = input.required<OwnerChatMediaItem[]>();

  readonly openChanged = output<boolean>();
  readonly closed = output<void>();
  readonly tabSelected = output<OwnerChatMediaTab>();
  readonly previewRequested = output<MediaPreviewItem>();

  protected readonly tabs = MEDIA_TABS;

  protected onVisibleChange(open: boolean): void {
    this.openChanged.emit(open);

    if (!open) {
      this.closed.emit();
    }
  }

  protected isMediaItem(item: OwnerChatMediaItem): boolean {
    return item.type === 'IMAGE' || item.type === 'VIDEO';
  }

  protected requestPreview(item: OwnerChatMediaItem): void {
    if (!this.isMediaItem(item)) {
      return;
    }

    this.previewRequested.emit({
      type: item.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      title: item.title,
      url: item.url,
    });
  }
}
