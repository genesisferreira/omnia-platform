/**
 * Organizações do grupo Omnia — seed idempotente Release 2.1.
 */
export const organizationsSeed = [
  {
    name: 'Omnia Frigo Holding',
    slug: 'omnia-frigo-holding',
    description: 'Holding estratégica do ecossistema Omnia Frigo.',
    type: 'holding' as const,
    active: true,
  },
  {
    name: 'Renovação',
    slug: 'renovacao',
    description: 'Engenharia e refrigeração.',
    type: 'vertical' as const,
    active: true,
  },
  {
    name: 'Fred do Frio',
    slug: 'fred-do-frio',
    description: 'Educação e academy em refrigeração.',
    type: 'education' as const,
    active: true,
  },
  {
    name: 'CTE',
    slug: 'cte',
    description: 'Formação técnica e normativa.',
    type: 'education' as const,
    active: true,
  },
  {
    name: 'Neurofrigo',
    slug: 'neurofrigo',
    description: 'Command IA e automação.',
    type: 'vertical' as const,
    active: true,
  },
  {
    name: 'Neurofrigo Carga',
    slug: 'neurofrigo-carga',
    description: 'Aplicativo de carga e logística refrigerada.',
    type: 'product' as const,
    active: true,
  },
  {
    name: 'Sapientia',
    slug: 'sapientia',
    description: 'Centro educacional parceiro.',
    type: 'education' as const,
    active: true,
  },
];
