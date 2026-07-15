/**
 * Dados iniciais das empresas da Holding — Sprint 2.
 * Executar via: pnpm --filter @omnia/admin seed
 */
export const holdingCompaniesSeed = [
  {
    name: 'Omnia Frigo Holding',
    slug: 'omnia-frigo-holding',
    shortDescription: 'Holding estratégica do ecossistema Omnia Frigo.',
    ecosystemRole: 'Holding',
    displayOrder: 1,
    externalSite: '',
    status: 'active' as const,
  },
  {
    name: 'Renovação Refrigeração',
    slug: 'renovacao-refrigeracao',
    shortDescription: 'Serviços especializados em refrigeração comercial e industrial.',
    ecosystemRole: 'Serviços',
    displayOrder: 2,
    externalSite: '',
    status: 'active' as const,
  },
  {
    name: 'Neurofrigo',
    slug: 'neurofrigo',
    shortDescription: 'Soluções inteligentes em refrigeração e tecnologia aplicada.',
    ecosystemRole: 'Tecnologia',
    displayOrder: 3,
    externalSite: '',
    status: 'active' as const,
  },
  {
    name: 'Fred do Frio Academy',
    slug: 'fred-do-frio-academy',
    shortDescription: 'Academy de formação e capacitação no setor de refrigeração.',
    ecosystemRole: 'Engenharia',
    displayOrder: 4,
    externalSite: '',
    status: 'active' as const,
  },
  {
    name: 'CTE',
    slug: 'cte',
    shortDescription: 'Centro de tecnologia e engenharia do ecossistema.',
    ecosystemRole: 'Educação',
    displayOrder: 5,
    externalSite: '',
    status: 'active' as const,
  },
  {
    name: 'Centro Educacional Sapientia',
    slug: 'centro-educacional-sapientia',
    shortDescription: 'Instituição educacional parceira do ecossistema Omnia.',
    ecosystemRole: 'Educação',
    displayOrder: 6,
    externalSite: '',
    status: 'active' as const,
  },
];

export const defaultTenantSeed = {
  name: 'Omnia Frigo Holding',
  slug: 'omnia-holding',
  description: 'Tenant principal do ecossistema Omnia Frigo Holding.',
  status: 'active' as const,
};
