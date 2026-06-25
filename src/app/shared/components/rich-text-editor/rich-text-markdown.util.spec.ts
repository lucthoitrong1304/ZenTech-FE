import { describe, expect, it } from 'vitest';
import { htmlToMarkdown, markdownToHtml } from './rich-text-markdown.util';

describe('rich text markdown utilities', () => {
  it('converts headings and paragraphs between markdown and html', () => {
    const html = markdownToHtml('# Title\n\n## Section\n\n### Detail\n\nPlain text');

    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<h2>Section</h2>');
    expect(html).toContain('<h3>Detail</h3>');
    expect(html).toContain('<p>Plain text</p>');
    expect(htmlToMarkdown(html)).toBe('# Title\n\n## Section\n\n### Detail\n\nPlain text');
  });

  it('supports inline formatting and links', () => {
    const markdown = '**Bold** *Italic* <u>Under</u> ~~Strike~~ [Docs](https://example.com)';
    const html = markdownToHtml(markdown);

    expect(html).toContain('<strong>Bold</strong>');
    expect(html).toContain('<em>Italic</em>');
    expect(html).toContain('<u>Under</u>');
    expect(html).toContain('<s>Strike</s>');
    expect(html).toContain('<a href="https://example.com">Docs</a>');
    expect(htmlToMarkdown(html)).toBe(markdown);
  });

  it('supports lists', () => {
    const html = markdownToHtml('- One\n- Two\n\n1. First\n2. Second');

    expect(html).toContain('<ul>');
    expect(html).toContain('<ol>');
    expect(htmlToMarkdown(html)).toBe('- One\n- Two\n\n1. First\n2. Second');
  });

  it('supports blockquotes and fenced code blocks', () => {
    const markdown = '> Quote one\n> Quote two\n\n```\nconst value = 1;\n```';
    const html = markdownToHtml(markdown);

    expect(html).toContain('<blockquote>Quote one<br>Quote two</blockquote>');
    expect(html).toContain('<pre>const value = 1;</pre>');
    expect(htmlToMarkdown(html)).toBe(markdown);
  });

  it('normalizes empty content', () => {
    expect(htmlToMarkdown('<p><br></p>')).toBe('');
    expect(markdownToHtml('')).toBe('');
  });
});
