const SENSITIVE_VALUE = '[MASKED]';
const SENSITIVE_KEYS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cardNumber',
  'cvv',
];

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');

  if (!localPart || !domain) {
    return email;
  }

  if (localPart.length <= 2) {
    return `${localPart.charAt(0)}*@${domain}`;
  }

  return `${localPart.charAt(0)}${'*'.repeat(localPart.length - 2)}${localPart.charAt(localPart.length - 1)}@${domain}`;
}

export function sanitizeUrl(url: string): string {
  const [path] = url.split('?');
  return path.replace(/\/\d+(?=\/|$)/g, '/:id');
}

export function sanitizeText(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, match => maskEmail(match))
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${SENSITIVE_VALUE}`);
}

export function sanitizeRecord(record: Record<string, string | number | boolean | null | undefined>): Record<string, string | number | boolean | null> {
  return Object.entries(record).reduce<Record<string, string | number | boolean | null>>((acc, [key, value]) => {
    const isSensitive = SENSITIVE_KEYS.some(sensitiveKey => key.toLowerCase().includes(sensitiveKey.toLowerCase()));

    if (isSensitive) {
      acc[key] = SENSITIVE_VALUE;
      return acc;
    }

    if (typeof value === 'string') {
      acc[key] = sanitizeText(value);
      return acc;
    }

    acc[key] = value ?? null;
    return acc;
  }, {});
}
