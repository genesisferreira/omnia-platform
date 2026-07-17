export const SEO_FALLBACK_TITLE = 'Omnia Frigo Holding';
export const SEO_FALLBACK_DESCRIPTION =
  'Tradição, Educação e Inteligência Artificial em Refrigeração.';
export const SEO_SITE_NAME = 'Omnia Frigo Holding';
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
