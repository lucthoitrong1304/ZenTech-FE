import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
import { LucideBot, LucideFileText, LucideImage, LucidePhone } from '@lucide/angular';
import { MediaPreviewItem } from '../../../../../shared/components/media-preview-dialog/media-preview-dialog.model';
import {
  ManagementChatConversation,
  ManagementChatMessageAttachment,
  ManagementChatMessage,
} from '../../data-access/models/management-chat.models';

@Component({
  selector: 'app-message-timeline',
  standalone: true,
  imports: [CommonModule, LucideBot, LucideFileText, LucideImage, LucidePhone],
  templateUrl: './message-timeline.component.html',
  host: {
    class: 'flex min-h-0 flex-1 flex-col',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageTimelineComponent {
  readonly conversation = input.required<ManagementChatConversation>();
  readonly messages = input.required<ManagementChatMessage[]>();
  readonly highlightedMessageId = input<string | null>(null);
  readonly previewRequested = output<MediaPreviewItem>();
  readonly highlightCleared = output<void>();

  constructor() {
    effect(() => {
      const id = this.highlightedMessageId();
      if (id) {
        setTimeout(() => {
          const el = document.getElementById(`msg-${id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            el.classList.add('bg-yellow-100/50', 'transition-colors', 'duration-1000');
            
            setTimeout(() => {
              el.classList.remove('bg-yellow-100/50', 'transition-colors', 'duration-1000');
              this.highlightCleared.emit();
            }, 3000);
          }
        }, 100);
      }
    });
  }

  protected isPreviewable(attachment: ManagementChatMessageAttachment): boolean {
    return attachment.type === 'IMAGE' || attachment.type === 'VIDEO';
  }

  protected requestPreview(attachment: ManagementChatMessageAttachment): void {
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
