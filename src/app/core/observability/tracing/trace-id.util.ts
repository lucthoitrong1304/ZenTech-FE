const TRACE_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const DEFAULT_TRACE_ID_LENGTH = 8;
const TRACE_ID_PATTERN = /^zt-[a-z0-9][a-z0-9_-]{7,63}$/i;

export function generateTraceId(prefix = 'ZT', length = DEFAULT_TRACE_ID_LENGTH): string {
  let result = '';

  for (let i = 0; i < length; i += 1) {
    result += TRACE_ID_CHARS.charAt(Math.floor(Math.random() * TRACE_ID_CHARS.length));
  }

  return `${prefix}-${result}`;
}

export function normalizeTraceIdInput(value: string | null | undefined): string {
  const trimmed = (value || '').trim();

  if (!TRACE_ID_PATTERN.test(trimmed)) {
    return '';
  }

  return `ZT-${trimmed.slice(3)}`;
}

export function isTraceIdInput(value: string | null | undefined): boolean {
  return normalizeTraceIdInput(value).length > 0;
}
