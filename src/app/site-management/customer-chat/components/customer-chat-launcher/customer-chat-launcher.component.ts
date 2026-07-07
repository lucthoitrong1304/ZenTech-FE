import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideMessageCircle } from '@lucide/angular';

@Component({
  selector: 'app-customer-chat-launcher',
  standalone: true,
  imports: [],
  templateUrl: './customer-chat-launcher.component.html',
  styleUrl: './customer-chat-launcher.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerChatLauncherComponent {
  readonly lastActivityLabel = input('');
  readonly opened = output<void>();
}
