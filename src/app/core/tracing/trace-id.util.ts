const TRACE_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const DEFAULT_TRACE_ID_LENGTH = 8;

export function generateTraceId(prefix = 'ZT', length = DEFAULT_TRACE_ID_LENGTH): string {
  let result = '';

  for (let i = 0; i < length; i += 1) {
    result += TRACE_ID_CHARS.charAt(Math.floor(Math.random() * TRACE_ID_CHARS.length));
  }

  return `${prefix}-${result}`;
}
