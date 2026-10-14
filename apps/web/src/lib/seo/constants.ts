export const SEO_FALLBACK_TITLE = 'Omnia Frigo Holding';
export const SEO_TAGLINE = 'Tradição, Educação e Inteligência Artificial em Refrigeração.';
export const SEO_FALLBACK_DESCRIPTION =
  'Ecossistema brasileiro de refrigeração, engenharia, educação profissional e inteligência artificial.';
export const SEO_SITE_NAME = 'Omnia Frigo Holding';

export function resolveInstitutionalDescription(value?: string | null): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed || trimmed === SEO_TAGLINE) return SEO_FALLBACK_DESCRIPTION;
  return trimmed;
}
export const SEO_LOCALE = 'pt_BR';
/** Imagem social padrão do Portal (Open Graph / Twitter). */
export const SEO_DEFAULT_OG_IMAGE_PATH = '/og-default.png';
export const SEO_DEFAULT_OG_IMAGE_ALT = 'Omnia Frigo Holding';

/** Rotas públicas institucionais conhecidas (sitemap + descoberta). */
export const SEO_PUBLIC_PAGE_CANDIDATES = [
  { pathname: '/', slug: 'home' },
  { pathname: '/sobre', slug: 'sobre' },
  { pathname: '/empresas', slug: 'empresas' },
  { pathname: '/contato', slug: 'contato' },
] as const;
