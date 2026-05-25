import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideBot, LucideFileText, LucideImage } from '@lucide/angular';
import { MediaPreviewItem } from '../../../../../shared/components/media-preview-dialog/media-preview-dialog.model';
import {
  OwnerChatConversation,
  OwnerChatMessageAttachment,
  OwnerChatMessage,
} from '../../data-access/models/owner-chat.models';

@Component({
  selector: 'app-message-timeline',
  standalone: true,
  imports: [CommonModule, LucideBot, LucideFileText, LucideImage],
  templateUrl: './message-timeline.component.html',
  host: {
    class: 'flex min-h-0 flex-1 flex-col',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageTimelineComponent {
  readonly conversation = input.required<OwnerChatConversation>();
  readonly messages = input.required<OwnerChatMessage[]>();
  readonly previewRequested = output<MediaPreviewItem>();

  protected isPreviewable(attachment: OwnerChatMessageAttachment): boolean {
    return attachment.type === 'IMAGE' || attachment.type === 'VIDEO';
  }

  protected requestPreview(attachment: OwnerChatMessageAttachment): void {
    if (!this.isPreviewable(attachment)) {
      return;
    }

    this.previewRequested.emit({
      type: attachment.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      title: attachment.title,
      url: attachment.url,
    });
  }
}
