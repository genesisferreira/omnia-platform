/**
 * Sanitização de hrefs públicos (CTA / links de bloco).
 * Aceita:
 * - caminhos internos com uma única `/` inicial;
 * - âncoras `#fragment`;
 * - URLs absolutas `http:` / `https:` sem credenciais.
 * Sem uso da API `URL` (lib compartilhada sem DOM types).
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isPlainRecord = isRecord;

export const readOptionalTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export const readRequiredTrimmedString = (value: unknown): string | null =>
  readOptionalTrimmedString(value);

const FORBIDDEN_SCHEME_PATTERN = /^(javascript|data|file|ftp|vbscript):/i;

/**
 * Detecta `user:pass@` imediatamente após `scheme://`.
 */
const hasEmbeddedCredentials = (value: string): boolean => {
  const schemeSeparator = value.indexOf('://');
  if (schemeSeparator < 0) {
    return false;
  }

  const afterScheme = value.slice(schemeSeparator + 3);
  const atIndex = afterScheme.indexOf('@');
  if (atIndex < 0) {
    return false;
  }

  const hostCandidate = afterScheme.slice(0, atIndex);
  return hostCandidate.includes(':') || hostCandidate.length > 0;
};

const isAbsoluteHttpUrl = (value: string): boolean => {
  if (!/^https?:\/\//i.test(value)) {
    return false;
  }

  if (FORBIDDEN_SCHEME_PATTERN.test(value)) {
    return false;
  }

  if (hasEmbeddedCredentials(value)) {
    return false;
  }

  // Host mínimo após scheme://
  const afterScheme = value.slice(value.indexOf('://') + 3);
  if (afterScheme.length === 0 || afterScheme.startsWith('/')) {
    return false;
  }

  return true;
};

/**
 * Âncoras `#id`, caminhos `/...` (sem `//`) e http(s) sem credenciais.
 */
export const sanitizePublicHref = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  if (trimmed.includes('\\')) {
    return null;
  }

  if (FORBIDDEN_SCHEME_PATTERN.test(trimmed)) {
    return null;
  }

  if (trimmed.startsWith('#')) {
    if (trimmed.length === 1) {
      return null;
    }
    if (/[\s<>"']/.test(trimmed)) {
      return null;
    }
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//')) {
      return null;
    }
    return trimmed;
  }

  if (isAbsoluteHttpUrl(trimmed)) {
    return trimmed;
  }

  return null;
};

export const sanitizePublicCanonicalUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  if (trimmed.includes('\\') || trimmed.startsWith('//')) {
    return null;
  }

  if (FORBIDDEN_SCHEME_PATTERN.test(trimmed)) {
    return null;
  }

  if (!isAbsoluteHttpUrl(trimmed)) {
    return null;
  }

  return trimmed;
};
