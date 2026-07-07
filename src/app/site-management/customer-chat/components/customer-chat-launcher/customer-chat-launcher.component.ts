import { ChangeDetectionStrategy, Component, input, output, signal, OnInit } from '@angular/core';

@Component({
  selector: 'app-customer-chat-launcher',
  standalone: true,
  imports: [],
  templateUrl: './customer-chat-launcher.component.html',
  styleUrl: './customer-chat-launcher.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerChatLauncherComponent implements OnInit {
  readonly lastActivityLabel = input('');
  readonly opened = output<void>();

  readonly showWelcomeBox = signal(true);
  readonly isHovered = signal(false);

  ngOnInit(): void {
    // Automatically close the welcome greeting box after 6 seconds
    setTimeout(() => {
      this.showWelcomeBox.set(false);
    }, 6000);
  }

  closeWelcomeBox(event: Event): void {
    event.stopPropagation(); // Prevent triggering parent button click
    this.showWelcomeBox.set(false);
  }
}
