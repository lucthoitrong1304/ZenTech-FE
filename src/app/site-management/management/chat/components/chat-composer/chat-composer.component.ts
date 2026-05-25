import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucideSend } from '@lucide/angular';

@Component({
  selector: 'app-chat-composer',
  standalone: true,
  imports: [FormsModule, LucidePlus, LucideSend],
  templateUrl: './chat-composer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComposerComponent {
  readonly messageSubmitted = output<string>();
  protected readonly draft = signal('');

  protected submit(): void {
    const value = this.draft().trim();

    if (!value) {
      return;
    }

    this.messageSubmitted.emit(value);
    this.draft.set('');
  }

  protected onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;

    if (keyboardEvent.shiftKey) {
      return;
    }

    keyboardEvent.preventDefault();
    this.submit();
  }
}
