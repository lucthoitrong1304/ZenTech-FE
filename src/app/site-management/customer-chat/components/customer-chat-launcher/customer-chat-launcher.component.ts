import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideMessageCircle } from '@lucide/angular';

@Component({
  selector: 'app-customer-chat-launcher',
  standalone: true,
  imports: [LucideMessageCircle],
  templateUrl: './customer-chat-launcher.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerChatLauncherComponent {
  readonly lastActivityLabel = input('');
  readonly opened = output<void>();
}
