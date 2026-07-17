/**
 * Navegação institucional compartilhada (Header + Footer).
 * Âncoras da Home usam prefixo `/` para funcionar a partir de qualquer rota.
 */
export const INSTITUTIONAL_NAV_ITEMS = [
  { href: '/sobre', label: 'Sobre' },
  { href: '/#ecossistema', label: 'Ecossistema' },
  { href: '/empresas', label: 'Empresas' },
  { href: '/blog', label: 'Blog' },
  { href: '/contato', label: 'Contato' },
] as const;
