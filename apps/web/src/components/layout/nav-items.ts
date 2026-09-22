/**
 * Navegação institucional compartilhada (Header + Footer).
 * Âncoras da Home usam prefixo `/` para funcionar a partir de qualquer rota.
 */
export type NavChild = { href: string; label: string };

export type NavItem = {
  href: string;
  label: string;
  children?: readonly NavChild[];
};

export const INSTITUTIONAL_NAV_ITEMS: readonly NavItem[] = [
  { href: '/sobre', label: 'Sobre' },
  { href: '/#ecossistema', label: 'Ecossistema' },
  { href: '/empresas', label: 'Empresas' },
  {
    href: '/parceiros',
    label: 'Parceiros',
    children: [
      { href: '/parceiros', label: 'Encontrar parceiros' },
      { href: '/parceiros/cadastro', label: 'Seja um parceiro' },
    ],
  },
  { href: '/blog', label: 'Blog' },
  { href: '/contato', label: 'Contato' },
] as const;
