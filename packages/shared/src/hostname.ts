const IPV4_PATTERN = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

const HOSTNAME_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export const normalizeHostname = (value: string): string => {
  if (typeof value !== 'string') {
    return '';
  }

  let candidate = value.trim().toLowerCase();

  if (candidate === '') {
    return '';
  }

  candidate = candidate.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  candidate = candidate.split('/')[0] ?? '';
  candidate = candidate.split('?')[0] ?? '';
  candidate = candidate.split('#')[0] ?? '';

  if (candidate.includes('@')) {
    candidate = candidate.slice(candidate.lastIndexOf('@') + 1);
  }

  if (candidate.startsWith('[')) {
    const closingBracket = candidate.indexOf(']');
    candidate = closingBracket >= 0 ? candidate.slice(1, closingBracket) : candidate.slice(1);
  } else {
    const colonIndex = candidate.lastIndexOf(':');

    if (colonIndex > -1 && !candidate.includes('.')) {
      candidate = candidate.slice(0, colonIndex);
    } else if (colonIndex > -1) {
      const afterColon = candidate.slice(colonIndex + 1);

      if (/^\d+$/.test(afterColon)) {
        candidate = candidate.slice(0, colonIndex);
      }
    }
  }

  candidate = candidate.replace(/\.$/, '');

  if (candidate.startsWith('www.')) {
    candidate = candidate.slice(4);
  }

  return candidate;
};

export const isValidHostname = (value: string): boolean => {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }

  const hostname = value.trim().toLowerCase();

  if (
    hostname.includes(' ') ||
    hostname.includes('/') ||
    hostname.includes('?') ||
    hostname.includes('#') ||
    hostname.includes(':') ||
    hostname.includes('://')
  ) {
    return false;
  }

  if (hostname === 'localhost') {
    return true;
  }

  if (IPV4_PATTERN.test(hostname)) {
    return true;
  }

  if (hostname.length > 253 || hostname.startsWith('.') || hostname.endsWith('.')) {
    return false;
  }

  const labels = hostname.split('.');

  if (labels.length === 0) {
    return false;
  }

  return labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      HOSTNAME_LABEL_PATTERN.test(label) &&
      !label.startsWith('-') &&
      !label.endsWith('-'),
  );
};

/**
 * Extrai o domínio raiz com heurística conservadora (dois últimos labels).
 *
 * Limitação: TLDs compostos (ex.: `.com.br`) não são resolvidos corretamente.
 * Exemplo: `admin.dev.omniafrigo.com.br` → `com.br`.
 * Suporte via Public Suffix List será implementado em feature futura.
 */
export const getRootDomain = (value: string): string | null => {
  const hostname = normalizeHostname(value);

  if (!hostname || !isValidHostname(hostname)) {
    return null;
  }

  if (hostname === 'localhost') {
    return 'localhost';
  }

  if (IPV4_PATTERN.test(hostname)) {
    return hostname;
  }

  const labels = hostname.split('.');

  if (labels.length === 1) {
    return labels[0] ?? null;
  }

  return labels.slice(-2).join('.');
};

/**
 * Constrói URL canônica.
 * Retorna `null` quando o hostname é inválido (não lança).
 */
export const buildCanonicalUrl = (
  hostname: string,
  pathname: string,
  protocol: 'http' | 'https' = 'https',
): string | null => {
  if (protocol !== 'http' && protocol !== 'https') {
    return null;
  }

  const normalizedHostname = normalizeHostname(hostname);

  if (!isValidHostname(normalizedHostname)) {
    return null;
  }

  const pathWithoutQuery = pathname.split('?')[0] ?? '';
  const pathWithoutFragment = pathWithoutQuery.split('#')[0] ?? '';
  const trimmedPath = pathWithoutFragment.trim();

  const normalizedPath =
    trimmedPath === '' ? '/' : `/${trimmedPath.replace(/^\/+/, '').replace(/\/{2,}/g, '/')}`;

  return `${protocol}://${normalizedHostname}${normalizedPath}`;
};
