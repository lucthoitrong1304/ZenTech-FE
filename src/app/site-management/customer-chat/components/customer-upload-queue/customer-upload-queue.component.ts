import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideCheck, LucideFileUp, LucideX } from '@lucide/angular';
import { CustomerChatUpload } from '../../data-access/models/customer-chat.models';

@Component({
  selector: 'app-customer-upload-queue',
  standalone: true,
  imports: [CommonModule, LucideCheck, LucideFileUp, LucideX],
  templateUrl: './customer-upload-queue.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerUploadQueueComponent {
  readonly uploads = input.required<CustomerChatUpload[]>();
  readonly uploadRemoved = output<string>();
}
