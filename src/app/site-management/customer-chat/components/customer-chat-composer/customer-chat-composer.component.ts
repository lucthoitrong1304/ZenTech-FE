import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucidePaperclip, LucideSendHorizontal } from '@lucide/angular';

@Component({
  selector: 'app-customer-chat-composer',
  standalone: true,
  imports: [FormsModule, LucidePaperclip, LucideSendHorizontal],
  templateUrl: './customer-chat-composer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerChatComposerComponent {
  readonly secureCaption = input(false);
  readonly disabled = input(false);
  readonly messageSubmitted = output<string>();
  readonly filesSelected = output<File[]>();
  protected readonly draft = signal('');
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected submit(): void {
    if (this.disabled()) {
      return;
    }

    const body = this.draft().trim();

    if (!body) {
      return;
    }

    this.messageSubmitted.emit(body);
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

  protected openFilePicker(): void {
    if (this.disabled()) {
      return;
    }
    this.fileInput()?.nativeElement.click();
  }

  protected onFileChange(event: Event): void {
    if (this.disabled()) {
      return;
    }
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    if (files.length > 0) {
      this.filesSelected.emit(files);
    }

    input.value = '';
  }
}
