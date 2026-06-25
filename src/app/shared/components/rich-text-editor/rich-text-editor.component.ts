import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  LucideBold,
  LucideCode,
  LucideHeading1,
  LucideHeading2,
  LucideHeading3,
  LucideItalic,
  LucideLink,
  LucideList,
  LucideListOrdered,
  LucidePilcrow,
  LucideQuote,
  LucideRedo,
  LucideRemoveFormatting,
  LucideStrikethrough,
  LucideUnderline,
  LucideUndo,
} from '@lucide/angular';
import Quill, { Range } from 'quill';
import type History from 'quill/modules/history';
import { htmlToMarkdown, markdownToHtml } from './rich-text-markdown.util';

type InlineFormat = 'bold' | 'italic' | 'underline' | 'strike';
type BlockFormat = 'paragraph' | 'header-1' | 'header-2' | 'header-3' | 'bullet' | 'ordered' | 'blockquote' | 'code-block';

interface EditorFormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  link: boolean;
  block: BlockFormat | null;
}

const EMPTY_FORMAT_STATE: EditorFormatState = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  link: false,
  block: null,
};

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [
    CommonModule,
    LucideBold,
    LucideCode,
    LucideHeading1,
    LucideHeading2,
    LucideHeading3,
    LucideItalic,
    LucideLink,
    LucideList,
    LucideListOrdered,
    LucidePilcrow,
    LucideQuote,
    LucideRedo,
    LucideRemoveFormatting,
    LucideStrikethrough,
    LucideUnderline,
    LucideUndo,
  ],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.css',
})
export class RichTextEditorComponent implements AfterViewInit, OnDestroy {
  readonly value = input<string>('');
  readonly placeholder = input<string>('');
  readonly minHeight = input<string>('136px');
  readonly valueChange = output<string>();

  @ViewChild('editor') private editorElement?: ElementRef<HTMLDivElement>;

  protected readonly formatState = signal<EditorFormatState>(EMPTY_FORMAT_STATE);
  protected readonly editorStyle = computed(() => ({ '--rich-editor-min-height': this.minHeight() }));

  private quill: Quill | null = null;
  private applyingExternalValue = false;
  private readonly handleRootKeydown = (event: KeyboardEvent): void => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    const format = getShortcutFormat(event.key);
    if (!format) {
      return;
    }

    queueMicrotask(() => this.updateFormatState());
  };

  constructor() {
    effect(() => {
      const value = this.value();
      if (!this.quill) {
        return;
      }

      untracked(() => {
        const current = htmlToMarkdown(this.quill?.getSemanticHTML() ?? '');
        if (current.trim() === value.trim()) {
          return;
        }
        this.setEditorMarkdown(value);
      });
    });
  }

  ngAfterViewInit(): void {
    if (!this.editorElement) {
      return;
    }

    this.quill = new Quill(this.editorElement.nativeElement, {
      modules: {
        toolbar: false,
        history: {
          delay: 700,
          maxStack: 100,
          userOnly: true,
        },
        keyboard: {
          bindings: {
            bold: { key: 'B', shortKey: true, handler: () => this.toggleInline('bold') },
            italic: { key: 'I', shortKey: true, handler: () => this.toggleInline('italic') },
            underline: { key: 'U', shortKey: true, handler: () => this.toggleInline('underline') },
          },
        },
      },
      placeholder: this.placeholder(),
      theme: 'snow',
      formats: ['bold', 'italic', 'underline', 'strike', 'header', 'list', 'blockquote', 'code-block', 'link', 'code'],
    });

    this.quill.root.addEventListener('keydown', this.handleRootKeydown);
    this.quill.on('text-change', () => {
      this.updateFormatState();
      if (this.applyingExternalValue || !this.quill) {
        return;
      }

      this.valueChange.emit(htmlToMarkdown(this.quill.getSemanticHTML()));
    });

    this.quill.on('selection-change', () => this.updateFormatState());
    this.setEditorMarkdown(this.value());
    this.updateFormatState();
  }

  ngOnDestroy(): void {
    this.quill?.root.removeEventListener('keydown', this.handleRootKeydown);
    this.quill = null;
  }

  protected isInlineActive(format: InlineFormat): boolean {
    return this.formatState()[format];
  }

  protected isBlockActive(format: BlockFormat): boolean {
    return this.formatState().block === format;
  }

  protected toggleInline(format: InlineFormat): boolean {
    const quill = this.focusedQuill();
    if (!quill) {
      return true;
    }

    const active = Boolean(quill.getFormat()[format]);
    quill.format(format, !active, 'user');
    this.updateFormatState({ [format]: !active });
    return false;
  }

  protected applyBlock(format: BlockFormat): void {
    const quill = this.focusedQuill();
    if (!quill) {
      return;
    }

    const active = this.formatState().block === format;
    if (format === 'paragraph' || active) {
      quill.format('header', false, 'user');
      quill.format('list', false, 'user');
      quill.format('blockquote', false, 'user');
      quill.format('code-block', false, 'user');
      this.updateFormatState();
      return;
    }

    if (format.startsWith('header-')) {
      quill.format('header', Number(format.replace('header-', '')), 'user');
      this.updateFormatState();
      return;
    }

    if (format === 'bullet' || format === 'ordered') {
      quill.format('list', format, 'user');
      this.updateFormatState();
      return;
    }

    quill.format(format, true, 'user');
    this.updateFormatState();
  }

  protected toggleLink(): void {
    const quill = this.focusedQuill();
    const range = quill?.getSelection();
    if (!quill || !range) {
      return;
    }

    if (this.formatState().link) {
      quill.formatText(range.index, Math.max(range.length, 1), 'link', false, 'user');
      this.updateFormatState();
      return;
    }

    const normalizedUrl = normalizeUrl(window.prompt('Nhập URL liên kết'));
    if (!normalizedUrl) {
      return;
    }

    if (range.length === 0) {
      quill.insertText(range.index, normalizedUrl, 'link', normalizedUrl, 'user');
      quill.setSelection(range.index + normalizedUrl.length, 0, 'silent');
    } else {
      quill.formatText(range.index, range.length, 'link', normalizedUrl, 'user');
    }
    this.updateFormatState();
  }

  protected clearFormatting(): void {
    const quill = this.focusedQuill();
    const range = quill?.getSelection();
    if (!quill || !range) {
      return;
    }

    quill.removeFormat(range.index, range.length || 1, 'user');
    quill.format('header', false, 'user');
    quill.format('list', false, 'user');
    quill.format('blockquote', false, 'user');
    quill.format('code-block', false, 'user');
    this.updateFormatState();
  }

  protected undo(): void {
    const quill = this.focusedQuill();
    if (!quill) {
      return;
    }

    (quill.getModule('history') as History).undo();
    this.updateFormatState();
  }

  protected redo(): void {
    const quill = this.focusedQuill();
    if (!quill) {
      return;
    }

    (quill.getModule('history') as History).redo();
    this.updateFormatState();
  }

  private focusedQuill(): Quill | null {
    if (!this.quill) {
      return null;
    }

    this.quill.focus();
    return this.quill;
  }

  private updateFormatState(overrides: Partial<EditorFormatState> = {}): void {
    if (!this.quill) {
      this.formatState.set({ ...EMPTY_FORMAT_STATE, ...overrides });
      return;
    }

    const range = this.quill.getSelection();
    if (!range) {
      this.formatState.set({ ...EMPTY_FORMAT_STATE, ...overrides });
      return;
    }

    const format = this.quill.getFormat(range);

    this.formatState.set({
      bold: Boolean(format['bold']),
      italic: Boolean(format['italic']),
      underline: Boolean(format['underline']),
      strike: Boolean(format['strike']),
      link: Boolean(format['link']),
      block: getBlockFormat(format),
      ...overrides,
    });
  }

  private setEditorMarkdown(markdown: string): void {
    if (!this.quill) {
      return;
    }

    this.applyingExternalValue = true;
    try {
      this.quill.clipboard.dangerouslyPasteHTML(markdownToHtml(markdown), 'silent');
      if (!this.quill.getSelection()) {
        this.setCursorToEnd();
      }
    } finally {
      this.applyingExternalValue = false;
    }
  }

  private setCursorToEnd(): void {
    if (!this.quill) {
      return;
    }

    const endIndex = Math.max(this.quill.getLength() - 1, 0);
    this.quill.setSelection(new Range(endIndex, 0), 'silent');
  }
}

function getShortcutFormat(key: string): InlineFormat | null {
  switch (key.toLowerCase()) {
    case 'b':
      return 'bold';
    case 'i':
      return 'italic';
    case 'u':
      return 'underline';
    default:
      return null;
  }
}

function getBlockFormat(format: Record<string, unknown>): BlockFormat {
  if (format['header'] === 1) {
    return 'header-1';
  }

  if (format['header'] === 2) {
    return 'header-2';
  }

  if (format['header'] === 3) {
    return 'header-3';
  }

  if (format['list'] === 'bullet') {
    return 'bullet';
  }

  if (format['list'] === 'ordered') {
    return 'ordered';
  }

  if (format['blockquote']) {
    return 'blockquote';
  }

  if (format['code-block']) {
    return 'code-block';
  }

  return 'paragraph';
}

function normalizeUrl(value: string | null): string | null {
  const url = value?.trim();
  if (!url) {
    return null;
  }

  if (/^(https?:\/\/|mailto:)/i.test(url)) {
    return url;
  }

  return `https://${url}`;
}
