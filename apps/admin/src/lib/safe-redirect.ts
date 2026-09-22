import { sanitizeRelativePath } from '@omnia/shared';

/**
 * Sanitiza o parâmetro `next` pós-login (somente paths relativos seguros).
 */
export function safeRedirectPath(candidate: string | null | undefined): string {
  return sanitizeRelativePath(candidate, '/');
}
