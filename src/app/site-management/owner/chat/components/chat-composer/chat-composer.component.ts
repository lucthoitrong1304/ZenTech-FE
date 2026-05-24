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
import { LucideFileUp, LucidePlus, LucideSend, LucideX } from '@lucide/angular';
import { OwnerChatUpload } from '../../data-access/models/owner-chat.models';

@Component({
  selector: 'app-chat-composer',
  standalone: true,
  imports: [FormsModule, LucideFileUp, LucidePlus, LucideSend, LucideX],
  templateUrl: './chat-composer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComposerComponent {
  readonly disabled = input(false);
  readonly uploads = input<OwnerChatUpload[]>([]);
  readonly hasPendingAttachments = input(false);
  readonly messageSubmitted = output<string>();
  readonly filesSelected = output<File[]>();
  readonly uploadRemoved = output<string>();
  protected readonly draft = signal('');
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected submit(): void {
    if (this.disabled()) {
      return;
    }
    const value = this.draft().trim();

    if (!value && !this.hasPendingAttachments()) {
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

    const inputElement = event.target as HTMLInputElement;
    const files = Array.from(inputElement.files ?? []);

    if (files.length > 0) {
      this.filesSelected.emit(files);
    }

    inputElement.value = '';
  }
}
