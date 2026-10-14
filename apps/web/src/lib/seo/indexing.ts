/**
 * Prefixos que não podem entrar em sitemap nem ficar liberados para crawlers.
 * `/escola` só redireciona para login — não há página institucional pública nesse prefixo.
 * `/cursos` permanece indexável: é catálogo público de captação, não área do aluno.
 */
export const PRIVATE_PATH_PREFIXES = [
  '/api',
  '/admin',
  '/aluno',
  '/professor',
  '/lms',
  '/meu-perfil',
  '/ia',
  '/login',
  '/cadastro',
  '/minha-conta',
  '/dispositivo',
  '/escola',
] as const;

const BLOCKED_SITEMAP_HOSTS = new Set(['localhost', '127.0.0.1']);

export function isPrivatePath(pathname: string): boolean {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const normalized = path.split('?')[0]?.split('#')[0] ?? path;
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

/** Apex canônico. `www` do mesmo registrável volta para o host sem www. */
export function canonicalPublicOrigin(origin: string): string {
  const url = new URL(origin);
  const host = url.hostname.toLowerCase();
  const apex = host.startsWith('www.') ? host.slice(4) : host;
  url.hostname = apex;
  url.protocol = apex === 'localhost' || apex.startsWith('127.') ? url.protocol : 'https:';
  url.username = '';
  url.password = '';
  url.search = '';
  url.hash = '';
  return url.origin;
}

/**
 * Host que não pode aparecer num sitemap cujo origem pública é produção.
 * O próprio host do deploy (inclusive DEV) é comparado à parte: só rejeita
 * quando o destino difere da origem canônica.
 */
export function isForeignSitemapHost(publicHost: string, candidateHost: string): boolean {
  const pub = publicHost.toLowerCase().replace(/^www\./, '');
  const candidate = candidateHost.toLowerCase().replace(/^www\./, '');
  if (candidate === pub) return false;
  if (BLOCKED_SITEMAP_HOSTS.has(candidate)) return true;
  if (candidate.startsWith('admin.') || candidate.includes('.dev.') || candidate.startsWith('dev.')) {
    return true;
  }
  if (candidate.startsWith('staging.') || candidate.includes('staging')) return true;
  return candidate !== pub;
}
