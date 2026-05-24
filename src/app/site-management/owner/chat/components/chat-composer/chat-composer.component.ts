import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
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
  readonly disabled = input(false);
  readonly messageSubmitted = output<string>();
  protected readonly draft = signal('');

  protected submit(): void {
    if (this.disabled()) {
      return;
    }
    const value = this.draft().trim();

    if (!value) {
      return;
    }

    this.messageSubmitted.emit(value);
    this.draft.set('');
  }

  protected onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;

    if (keyboardEvent.shiftKey || this.disabled()) {
      return;
    }

    keyboardEvent.preventDefault();
    this.submit();
  }
}
