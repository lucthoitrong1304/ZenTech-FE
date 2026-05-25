import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideMessageCircle } from '@lucide/angular';

@Component({
  selector: 'app-chat-empty-state',
  standalone: true,
  imports: [LucideMessageCircle],
  templateUrl: './chat-empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatEmptyStateComponent {}
