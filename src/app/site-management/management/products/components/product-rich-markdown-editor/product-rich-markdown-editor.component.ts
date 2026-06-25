import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
  output,
  untracked,
} from '@angular/core';
import Quill from 'quill';

@Component({
  selector: 'app-product-rich-markdown-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rich-editor">
      <div #toolbar class="rich-editor__toolbar">
        <button type="button" class="ql-bold" aria-label="Bold"></button>
        <button type="button" class="ql-italic" aria-label="Italic"></button>
        <button type="button" class="ql-header" value="2" aria-label="Heading"></button>
        <button type="button" class="ql-list" value="bullet" aria-label="Bullet list"></button>
        <button type="button" class="ql-list" value="ordered" aria-label="Numbered list"></button>
      </div>
      <div #editor class="rich-editor__surface"></div>
    </div>
  `,
  styleUrl: './product-rich-markdown-editor.component.css',
})
export class ProductRichMarkdownEditorComponent implements AfterViewInit, OnDestroy {
  readonly value = input<string>('');
  readonly placeholder = input<string>('');
  readonly valueChange = output<string>();

  @ViewChild('editor') private editorElement?: ElementRef<HTMLDivElement>;
  @ViewChild('toolbar') private toolbarElement?: ElementRef<HTMLDivElement>;

  private quill: Quill | null = null;
  private applyingExternalValue = false;

  constructor() {
    effect(() => {
      const value = this.value();
      if (!this.quill) {
        return;
      }

      untracked(() => {
        const current = htmlToMarkdown(this.quill?.root.innerHTML ?? '');
        if (current.trim() === value.trim()) {
          return;
        }
        this.setEditorMarkdown(value);
      });
    });
  }

  ngAfterViewInit(): void {
    if (!this.editorElement || !this.toolbarElement) {
      return;
    }

    this.quill = new Quill(this.editorElement.nativeElement, {
      modules: {
        toolbar: this.toolbarElement.nativeElement,
        keyboard: {
          bindings: {
            bold: { key: 'B', shortKey: true, handler: () => this.toggleInline('bold') },
            italic: { key: 'I', shortKey: true, handler: () => this.toggleInline('italic') },
          },
        },
      },
      placeholder: this.placeholder(),
      theme: 'snow',
    });

    this.quill.on('text-change', () => {
      if (this.applyingExternalValue || !this.quill) {
        return;
      }
      this.valueChange.emit(htmlToMarkdown(this.quill.root.innerHTML));
    });

    this.setEditorMarkdown(this.value());
  }

  ngOnDestroy(): void {
    this.quill = null;
  }

  private toggleInline(format: 'bold' | 'italic'): boolean {
    if (!this.quill) {
      return true;
    }
    const active = Boolean(this.quill.getFormat()[format]);
    this.quill.format(format, !active);
    return false;
  }

  private setEditorMarkdown(markdown: string): void {
    if (!this.quill) {
      return;
    }

    this.applyingExternalValue = true;
    this.quill.clipboard.dangerouslyPasteHTML(markdownToHtml(markdown));
    this.applyingExternalValue = false;
  }
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const closeList = (): void => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }

    if (trimmed.startsWith('## ')) {
      closeList();
      html.push(`<h2>${inlineMarkdownToHtml(trimmed.slice(3))}</h2>`);
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      if (listType !== 'ul') {
        closeList();
        html.push('<ul>');
        listType = 'ul';
      }
      html.push(`<li>${inlineMarkdownToHtml(bulletMatch[1])}</li>`);
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (listType !== 'ol') {
        closeList();
        html.push('<ol>');
        listType = 'ol';
      }
      html.push(`<li>${inlineMarkdownToHtml(orderedMatch[1])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${inlineMarkdownToHtml(trimmed)}</p>`);
  }

  closeList();
  return html.join('');
}

function inlineMarkdownToHtml(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function htmlToMarkdown(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = html;

  const blocks = Array.from(container.childNodes)
    .map(nodeToMarkdown)
    .filter(Boolean);

  return blocks.join('\n\n').trim();
}

function nodeToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.trim() ?? '';
  }

  if (!(node instanceof HTMLElement)) {
    return '';
  }

  const tag = node.tagName.toLowerCase();
  if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
    return `## ${inlineHtmlToMarkdown(node)}`;
  }
  if (tag === 'ul') {
    return Array.from(node.children)
      .map(child => `- ${inlineHtmlToMarkdown(child as HTMLElement)}`)
      .join('\n');
  }
  if (tag === 'ol') {
    return Array.from(node.children)
      .map((child, index) => `${index + 1}. ${inlineHtmlToMarkdown(child as HTMLElement)}`)
      .join('\n');
  }
  if (tag === 'p') {
    return inlineHtmlToMarkdown(node);
  }

  return inlineHtmlToMarkdown(node);
}

function inlineHtmlToMarkdown(element: HTMLElement): string {
  return Array.from(element.childNodes)
    .map(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        return child.textContent ?? '';
      }
      if (!(child instanceof HTMLElement)) {
        return '';
      }
      const text = inlineHtmlToMarkdown(child);
      const tag = child.tagName.toLowerCase();
      if (tag === 'strong' || tag === 'b') {
        return `**${text}**`;
      }
      if (tag === 'em' || tag === 'i') {
        return `*${text}*`;
      }
      return text;
    })
    .join('')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
