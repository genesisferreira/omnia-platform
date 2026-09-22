/**
 * Conteúdo institucional canônico da Home omnia-hub (S04-F6).
 *
 * Fontes:
 * - Missão, Visão 2035 e Valores: especificação S04-F6 (conteúdo institucional conhecido).
 * - Intro: docs/07-adrs/ADR-011_PLATFORM_PRINCIPLES.md (hub integrador do ecossistema)
 *   + apps/admin/src/seed/holding-home.ts (narrativa do ecossistema integrado).
 * - Slogan: holding-home.ts / GlobalSettings / Footer.
 */

/** Layout baseline F4C/F5 (3 blocos) — usado para upgrade idempotente. */
export const holdingHomeBaselineLayout = [
  {
    blockType: 'hero' as const,
    title: 'Ecossistema Omnia Frigo Holding',
    subtitle: 'Tradição, Educação e Inteligência Artificial em Refrigeração.',
    primaryAction: {
      label: 'Conheça o ecossistema',
      href: '#ecossistema',
    },
    secondaryAction: undefined,
    variant: 'default' as const,
  },
  {
    blockType: 'features' as const,
    title: 'Um ecossistema integrado',
    subtitle:
      'A Omnia Frigo Holding conecta holding, serviços, tecnologia, educação e engenharia em uma única plataforma.',
    columns: '3' as const,
    items: [
      {
        title: 'Multiempresa',
        description: 'Estrutura de tenants e empresas preparada para escalar.',
        iconKey: 'multiempresa' as const,
      },
      {
        title: 'CMS centralizado',
        description: 'Conteúdo gerenciado via Payload CMS no painel admin.',
        iconKey: 'cms' as const,
      },
      {
        title: 'Design unificado',
        description: 'Identidade visual Omnia aplicada em portal e admin.',
        iconKey: 'design' as const,
      },
    ],
  },
  {
    blockType: 'companies' as const,
    title: 'Empresas do ecossistema',
    subtitle: 'Conheça as marcas que compõem a Omnia Frigo Holding.',
    limit: 6,
    showRole: true,
    showDescription: true,
    layout: 'grid' as const,
  },
] as const;

export const holdingHomeInstitutionalBlocks = [
  {
    blockType: 'institutionalIntro' as const,
    eyebrow: 'Omnia Frigo Holding',
    title: 'Hub integrador do ecossistema de refrigeração',
    body: 'A Omnia Frigo Holding conecta holding, serviços, tecnologia, educação e engenharia em uma plataforma digital — integrando conhecimento técnico, formação de profissionais e inteligência artificial aplicada à refrigeração.',
    highlights: [
      { text: 'Tradição em refrigeração' },
      { text: 'Educação e formação' },
      { text: 'Inteligência artificial aplicada' },
      { text: 'Ecossistema integrado' },
    ],
  },
  {
    blockType: 'missionVision' as const,
    missionTitle: 'Missão',
    missionBody:
      'Transformar a refrigeração brasileira por meio da união entre conhecimento técnico real, formação de profissionais, execução de projetos e tecnologia inteligente orientada por dados.',
    visionTitle: 'Visão 2035',
    visionBody:
      'Ser referência na América Latina em educação, engenharia e inteligência artificial aplicadas à refrigeração, climatização e utilidades industriais.',
    visionYear: '2035',
  },
  {
    blockType: 'values' as const,
    title: 'Nossos valores',
    subtitle: 'Princípios que orientam o ecossistema Omnia Frigo Holding.',
    items: [
      {
        title: 'Ética',
        description: 'Conduta transparente e responsável em todas as relações.',
        iconKey: 'ethics' as const,
      },
      {
        title: 'Parceria',
        description: 'Colaboração entre empresas, profissionais e clientes.',
        iconKey: 'partnership' as const,
      },
      {
        title: 'Excelência',
        description: 'Compromisso com qualidade técnica e operacional.',
        iconKey: 'excellence' as const,
      },
      {
        title: 'Inovação',
        description: 'Evolução contínua com tecnologia e inteligência aplicada.',
        iconKey: 'innovation' as const,
      },
      {
        title: 'Foco no Cliente',
        description: 'Soluções orientadas às necessidades reais do mercado.',
        iconKey: 'customer' as const,
      },
      {
        title: 'Resultados',
        description: 'Entrega mensurável e impacto sustentável no ecossistema.',
        iconKey: 'results' as const,
      },
    ],
  },
] as const;

export const holdingHomeFullLayout = [
  holdingHomeBaselineLayout[0],
  ...holdingHomeInstitutionalBlocks,
  holdingHomeBaselineLayout[1],
  holdingHomeBaselineLayout[2],
] as const;

export const HOLDING_HOME_BASELINE_BLOCK_TYPES = ['hero', 'features', 'companies'] as const;
export const HOLDING_HOME_FULL_BLOCK_TYPES = [
  'hero',
  'institutionalIntro',
  'missionVision',
  'values',
  'features',
  'companies',
] as const;
