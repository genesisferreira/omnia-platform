/**
 * Sanitiza o parâmetro `next` pós-login (somente paths relativos seguros).
 */
export function safeRedirectPath(candidate: string | null | undefined): string {
  if (!candidate || typeof candidate !== 'string') {
    return '/';
  }
  const trimmed = candidate.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return '/';
  }
  if (trimmed.startsWith('/login') || trimmed.startsWith('/api/')) {
    return '/';
  }
  return trimmed;
}
