type ListType = 'bullet' | 'ordered';

interface MarkdownLineState {
  html: string[];
  listType: ListType | null;
  blockquoteLines: string[];
  codeLines: string[];
  inCodeBlock: boolean;
}

export function markdownToHtml(markdown: string): string {
  const state: MarkdownLineState = {
    html: [],
    listType: null,
    blockquoteLines: [],
    codeLines: [],
    inCodeBlock: false,
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '');
    const trimmed = line.trim();

    if (state.inCodeBlock) {
      if (trimmed === '```') {
        state.html.push(`<pre>${escapeHtml(state.codeLines.join('\n'))}</pre>`);
        state.codeLines = [];
        state.inCodeBlock = false;
      } else {
        state.codeLines.push(line);
      }
      continue;
    }

    if (trimmed === '```') {
      closeList(state);
      closeBlockquote(state);
      state.inCodeBlock = true;
      continue;
    }

    if (!trimmed) {
      closeList(state);
      closeBlockquote(state);
      continue;
    }

    const blockquoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (blockquoteMatch) {
      closeList(state);
      state.blockquoteLines.push(inlineMarkdownToHtml(blockquoteMatch[1]));
      continue;
    }

    closeBlockquote(state);

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      closeList(state);
      const level = headingMatch[1].length;
      state.html.push(`<h${level}>${inlineMarkdownToHtml(headingMatch[2])}</h${level}>`);
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      openList(state, 'bullet');
      state.html.push(`<li>${inlineMarkdownToHtml(bulletMatch[1])}</li>`);
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      openList(state, 'ordered');
      state.html.push(`<li>${inlineMarkdownToHtml(orderedMatch[1])}</li>`);
      continue;
    }

    closeList(state);
    state.html.push(`<p>${inlineMarkdownToHtml(trimmed)}</p>`);
  }

  if (state.inCodeBlock) {
    state.html.push(`<pre>${escapeHtml(state.codeLines.join('\n'))}</pre>`);
  }

  closeList(state);
  closeBlockquote(state);

  return state.html.join('');
}

export function htmlToMarkdown(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = html;

  return Array.from(container.childNodes)
    .map(nodeToMarkdown)
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function openList(state: MarkdownLineState, listType: ListType): void {
  if (state.listType === listType) {
    return;
  }

  closeList(state);
  state.html.push(listType === 'bullet' ? '<ul>' : '<ol>');
  state.listType = listType;
}

function closeList(state: MarkdownLineState): void {
  if (!state.listType) {
    return;
  }

  state.html.push(state.listType === 'bullet' ? '</ul>' : '</ol>');
  state.listType = null;
}

function closeBlockquote(state: MarkdownLineState): void {
  if (state.blockquoteLines.length === 0) {
    return;
  }

  state.html.push(`<blockquote>${state.blockquoteLines.join('<br>')}</blockquote>`);
  state.blockquoteLines = [];
}

function nodeToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return normalizeInlineText(node.textContent ?? '');
  }

  if (!(node instanceof HTMLElement)) {
    return '';
  }

  const tag = node.tagName.toLowerCase();

  if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
    const level = Number(tag.slice(1));
    return `${'#'.repeat(level)} ${inlineHtmlToMarkdown(node)}`;
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

  if (tag === 'blockquote') {
    return inlineHtmlToMarkdown(node)
      .split('\n')
      .map(line => `> ${line}`)
      .join('\n');
  }

  if (tag === 'pre') {
    return `\`\`\`\n${node.textContent?.replace(/\n$/, '') ?? ''}\n\`\`\``;
  }

  if (tag === 'p') {
    return inlineHtmlToMarkdown(node);
  }

  return inlineHtmlToMarkdown(node);
}

function inlineMarkdownToHtml(value: string): string {
  let result = escapeHtml(value);

  result = result.replace(/`([^`]+?)`/g, '<code>$1</code>');
  result = result.replace(/\[([^\]]+?)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2">$1</a>');
  result = result.replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, '<u>$1</u>');
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/~~(.+?)~~/g, '<s>$1</s>');
  result = result.replace(/(^|[^*])\*(?!\s)(.+?)(?<!\s)\*/g, '$1<em>$2</em>');

  return result;
}

function inlineHtmlToMarkdown(element: HTMLElement): string {
  return Array.from(element.childNodes)
    .map(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        return normalizeInlineText(child.textContent ?? '');
      }

      if (!(child instanceof HTMLElement)) {
        return '';
      }

      const tag = child.tagName.toLowerCase();

      if (tag === 'br') {
        return '\n';
      }

      const text = inlineHtmlToMarkdown(child);

      if (!text) {
        return '';
      }

      if (tag === 'strong' || tag === 'b') {
        return `**${text}**`;
      }

      if (tag === 'em' || tag === 'i') {
        return `*${text}*`;
      }

      if (tag === 'u') {
        return `<u>${text}</u>`;
      }

      if (tag === 's' || tag === 'strike') {
        return `~~${text}~~`;
      }

      if (tag === 'a') {
        const href = child.getAttribute('href')?.trim();
        return href ? `[${text}](${href})` : text;
      }

      if (tag === 'code') {
        return `\`${text}\``;
      }

      return text;
    })
    .join('')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function normalizeInlineText(value: string): string {
  return value.replace(/\u00a0/g, ' ');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
