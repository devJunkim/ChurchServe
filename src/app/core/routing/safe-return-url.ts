export function safeReturnUrl(value: string | null, fallback = '/schedule'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }

  return value;
}
