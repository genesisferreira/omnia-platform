/**
 * Sanitiza `next` para redirecionamento ao Portal Web (somente path relativo seguro).
 */
export function safePortalNextPath(candidate: string | null | undefined, fallback = '/ia'): string {
  if (!candidate || typeof candidate !== 'string') return fallback;
  const trimmed = candidate.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return fallback;
  }
  if (
    trimmed.startsWith('/login') ||
    trimmed.startsWith('/api/') ||
    trimmed.startsWith('/admin') ||
    trimmed.startsWith('/area/')
  ) {
    return fallback;
  }
  return trimmed;
}

/** Paths that clearly belong to the Portal experience (not Payload Admin UI). */
export function isPortalDestination(path: string): boolean {
  const p = safePortalNextPath(path, '');
  if (!p) return false;
  return (
    p === '/ia' ||
    p.startsWith('/ia/') ||
    p.startsWith('/cursos') ||
    p.startsWith('/lms') ||
    p.startsWith('/minha-conta') ||
    p.startsWith('/meu-perfil') ||
    p.startsWith('/empresas') ||
    p.startsWith('/blog') ||
    p.startsWith('/parceiros') ||
    p.startsWith('/ecossistema') ||
    p === '/'
  );
}

export const PORTAL_ROLES = new Set(['student', 'instructor', 'client', 'partner']);

export const ADMIN_PANEL_ROLES = new Set([
  'super_admin',
  'admin',
  'editor',
  'neurofrigo_admin',
  'technical_reviewer',
  'publisher',
]);
