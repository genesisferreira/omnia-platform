/**
 * Seed canônico do Blog do site omnia-hub (Sprint 05).
 * Idempotente — cria somente se o slug ainda não existir; nunca sobrescreve.
 */

export const HOLDING_BLOG_SITE_SLUG = 'omnia-hub';

export type BlogSeedDecision =
  | { action: 'create' }
  | { action: 'skip'; reason: 'slug_exists'; detail: string }
  | { action: 'abort'; reason: 'site_not_found'; detail: string };

export type ExistingBlogProbe = {
  id: string | number;
  slug: string;
};

export const decideBlogSeedItem = (args: {
  siteFound: boolean;
  siteSlug: string;
  entityLabel: string;
  entitySlug: string;
  existingBySlug: ExistingBlogProbe | null;
}): BlogSeedDecision => {
  if (!args.siteFound) {
    return {
      action: 'abort',
      reason: 'site_not_found',
      detail: `Site "${args.siteSlug}" não encontrado. Execute o seed de sites antes.`,
    };
  }

  if (args.existingBySlug) {
    return {
      action: 'skip',
      reason: 'slug_exists',
      detail: `${args.entityLabel} "${args.entitySlug}" já existe (id=${args.existingBySlug.id}).`,
    };
  }

  return { action: 'create' };
};

/** Conteúdo Lexical mínimo compatível com Payload richText. */
export const buildLexicalContent = (
  sections: Array<{ heading: string; body: string }>,
): Record<string, unknown> => ({
  root: {
    type: 'root',
    children: sections.flatMap((section) => [
      {
        type: 'heading',
        tag: 'h2',
        children: [{ type: 'text', text: section.heading, version: 1 }],
        version: 1,
      },
      {
        type: 'paragraph',
        children: [{ type: 'text', text: section.body, version: 1 }],
        version: 1,
      },
    ]),
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
});

export const holdingBlogAuthorSeed = {
  name: 'Equipe Omnia',
  slug: 'equipe-omnia',
  bio: 'Conteúdo institucional da Omnia Frigo Holding sobre o ecossistema de refrigeração.',
} as const;

export const holdingBlogCategoriesSeed = [
  {
    name: 'Institucional',
    slug: 'institucional',
    description: 'Notícias e posicionamentos da Holding.',
  },
  {
    name: 'Tecnologia',
    slug: 'tecnologia',
    description: 'Inovação, IA e soluções técnicas em refrigeração.',
  },
] as const;

export const holdingBlogTagsSeed = [
  { name: 'Holding', slug: 'holding' },
  { name: 'Refrigeração', slug: 'refrigeracao' },
  { name: 'Inovação', slug: 'inovacao' },
] as const;

export type HoldingBlogPostSeed = {
  title: string;
  slug: string;
  excerpt: string;
  categorySlugs: readonly string[];
  tagSlugs: readonly string[];
  content: Record<string, unknown>;
  seo: {
    metaTitle: string;
    metaDescription: string;
    canonicalUrl: string | null;
    noIndex: boolean;
  };
};

export const holdingBlogPostsSeed: readonly HoldingBlogPostSeed[] = [
  {
    title: 'Bem-vindo ao Blog da Omnia Frigo Holding',
    slug: 'bem-vindo-ao-blog-omnia',
    excerpt:
      'Conheça o espaço editorial da Holding: tradição, educação e inteligência artificial em refrigeração.',
    categorySlugs: ['institucional'],
    tagSlugs: ['holding'],
    content: buildLexicalContent([
      {
        heading: 'Um canal para o ecossistema',
        body: 'O Blog da Omnia Frigo Holding reúne conteúdos institucionais e técnicos sobre o ecossistema de refrigeração, educação e tecnologia.',
      },
      {
        heading: 'O que você encontra aqui',
        body: 'Publicamos atualizações da Holding, insights de inovação e artigos que conectam as empresas do grupo às melhores práticas do setor.',
      },
    ]),
    seo: {
      metaTitle: 'Bem-vindo ao Blog | Omnia Frigo Holding',
      metaDescription:
        'Conheça o Blog da Omnia Frigo Holding: tradição, educação e inteligência artificial em refrigeração.',
      canonicalUrl: null,
      noIndex: false,
    },
  },
  {
    title: 'Refrigeração eficiente no Brasil',
    slug: 'refrigeracao-eficiente-no-brasil',
    excerpt:
      'Como eficiência energética e manutenção inteligente elevam a performance de sistemas de refrigeração.',
    categorySlugs: ['tecnologia'],
    tagSlugs: ['refrigeracao', 'inovacao'],
    content: buildLexicalContent([
      {
        heading: 'Desempenho e consumo',
        body: 'A eficiência em refrigeração começa pelo dimensionamento correto, operação estável e monitoramento contínuo de temperatura e consumo.',
      },
      {
        heading: 'Manutenção preditiva',
        body: 'Sensores e análise de dados permitem antecipar falhas, reduzir paradas e prolongar a vida útil dos equipamentos.',
      },
    ]),
    seo: {
      metaTitle: 'Refrigeração eficiente | Omnia Frigo Holding',
      metaDescription:
        'Eficiência energética e manutenção inteligente em sistemas de refrigeração no Brasil.',
      canonicalUrl: null,
      noIndex: false,
    },
  },
  {
    title: 'Inovação no ecossistema Omnia',
    slug: 'inovacao-no-ecossistema-omnia',
    excerpt:
      'Como educação, engenharia e tecnologia se conectam para acelerar a inovação em refrigeração.',
    categorySlugs: ['institucional', 'tecnologia'],
    tagSlugs: ['holding', 'inovacao'],
    content: buildLexicalContent([
      {
        heading: 'Ecossistema integrado',
        body: 'A Omnia Frigo Holding articula empresas de serviços, tecnologia, educação e engenharia para entregar valor ponta a ponta.',
      },
      {
        heading: 'Tradição com inteligência artificial',
        body: 'Combinamos experiência de campo com soluções digitais para apoiar decisões melhores em projetos e operações de refrigeração.',
      },
    ]),
    seo: {
      metaTitle: 'Inovação no ecossistema | Omnia Frigo Holding',
      metaDescription: 'Educação, engenharia e tecnologia no ecossistema Omnia Frigo Holding.',
      canonicalUrl: null,
      noIndex: false,
    },
  },
];
