import { sanitizeRelativePath } from './public-origin';

export const PORTAL_ROLES = new Set(['student', 'instructor', 'client', 'partner']);

export const ADMIN_PANEL_ROLES = new Set([
  'super_admin',
  'admin',
  'editor',
  'neurofrigo_admin',
  'technical_reviewer',
]);

export function safePortalNextPath(candidate: string | null | undefined, fallback = '/ia'): string {
  const sanitized = sanitizeRelativePath(candidate, fallback);
  if (sanitized.startsWith('/area/')) return fallback;
  return sanitized;
}

export function isPortalDestination(path: string): boolean {
  const p = safePortalNextPath(path, '');
  if (!p) return false;
  return (
    p === '/ia' ||
    p.startsWith('/ia/') ||
    p.startsWith('/cursos') ||
    p.startsWith('/lms') ||
    p.startsWith('/aluno') ||
    p.startsWith('/professor') ||
    p.startsWith('/certificados') ||
    p.startsWith('/minha-conta') ||
    p.startsWith('/meu-perfil') ||
    p.startsWith('/empresas') ||
    p.startsWith('/blog') ||
    p.startsWith('/parceiros') ||
    p.startsWith('/ecossistema') ||
    p === '/'
  );
}

/**
 * Destination after Portal establish. Authenticated role wins; `next` is a same-role hint.
 * Always a relative path — never an absolute URL and never derived from request.url.
 */
export function resolveEstablishDestination(
  role: string | null | undefined,
  requestedNext?: string | null,
): string {
  const requested = typeof requestedNext === 'string' ? requestedNext.trim() : '';
  const safe = requested ? safePortalNextPath(requested, '') : '';
  if (role === 'student') {
    if (safe.startsWith('/aluno')) return safe;
    return '/aluno';
  }
  if (role === 'instructor') {
    if (safe.startsWith('/professor')) return safe;
    return '/professor';
  }
  if (role === 'client' || role === 'partner') {
    if (
      safe &&
      safe !== '/' &&
      isPortalDestination(safe) &&
      !safe.startsWith('/aluno') &&
      !safe.startsWith('/professor')
    ) {
      return safe;
    }
    return '/ia';
  }
  if (role && ADMIN_PANEL_ROLES.has(role)) {
    if (safe && isPortalDestination(safe) && safe !== '/') return safe;
    return '/ia';
  }
  return '/ia';
}
