/**
 * Conteúdo estratégico das páginas /empresas/[portalSlug] — Sprint 06.
 * Não altera slugs internos usados por Sites; define portalSlug público.
 */

export type StrategicCompanySeed = {
  slug: string;
  portalSlug: string;
  name: string;
  shortDescription: string;
  positioning: string;
  ecosystemRole: string;
  brandTheme: 'renovacao' | 'fred' | 'cte' | 'neurofrigo';
  displayOrder: number;
  externalSite: string;
  institutionalText: string;
  mission: string;
  vision: string;
  values: Array<{ title: string; description: string }>;
  differentiators: Array<{ title: string; description: string }>;
  authorityStats: Array<{ value: string; label: string }>;
  offerings: Array<{
    title: string;
    description?: string;
    kind: 'service' | 'product' | 'course' | 'solution';
  }>;
  audiences: Array<{ title: string; description: string }>;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  seo: {
    metaTitle: string;
    metaDescription: string;
    schemaType: string;
  };
};

export const strategicCompaniesSeed: readonly StrategicCompanySeed[] = [
  {
    slug: 'renovacao-refrigeracao',
    portalSlug: 'renovacao',
    name: 'Renovação Refrigeração',
    shortDescription:
      'Engenharia, projetos, instalação, manutenção e execução técnica em refrigeração.',
    positioning:
      'Braço de engenharia, projetos, instalação, manutenção e soluções técnicas da Holding.',
    ecosystemRole: 'Engenharia',
    brandTheme: 'renovacao',
    displayOrder: 1,
    externalSite: 'https://renovacaorefrigeracao.com.br',
    institutionalText:
      'A Renovação Refrigeração é a frente de execução técnica do ecossistema Omnia Frigo: projetos, instalação, manutenção e soluções de campo para operações comerciais e industriais.',
    mission:
      'Entregar engenharia e execução técnica confiáveis que sustentem a performance de sistemas de refrigeração.',
    vision:
      'Ser a referência nacional em projetos e manutenção de refrigeração comercial e industrial.',
    values: [
      {
        title: 'Precisão técnica',
        description: 'Dimensionamento, instalação e manutenção com padrão industrial.',
      },
      {
        title: 'Confiabilidade',
        description: 'Operações estáveis, com redução de paradas e risco.',
      },
      {
        title: 'Evolução contínua',
        description: 'Retrofit, eficiência energética e modernização de ativos.',
      },
    ],
    differentiators: [
      {
        title: 'Histórico de campo',
        description: 'Décadas de projetos e manutenção em ambientes críticos.',
      },
      {
        title: 'Capacidade industrial',
        description: 'Compressores, câmaras, chillers e sistemas correlatos.',
      },
      {
        title: 'Integração com o ecossistema',
        description: 'Conecta engenharia à educação, formação e inteligência aplicada.',
      },
    ],
    authorityStats: [
      { value: '+30', label: 'anos de história' },
      { value: '+5.000', label: 'projetos' },
      { value: '+20.115', label: 'peças e componentes' },
    ],
    offerings: [
      { title: 'Projetos de refrigeração comercial e industrial', kind: 'service' },
      { title: 'Câmaras frigoríficas', kind: 'service' },
      { title: 'Salas limpas e ambientes especiais', kind: 'service' },
      { title: 'Climatização industrial', kind: 'service' },
      { title: 'Compressores e componentes', kind: 'product' },
      { title: 'Retífica e reforma de compressores', kind: 'service' },
      { title: 'Retrofit', kind: 'service' },
      { title: 'Consultoria técnica', kind: 'service' },
      { title: 'Manutenção preventiva e corretiva', kind: 'service' },
      { title: 'Chillers e sistemas correlatos', kind: 'service' },
    ],
    audiences: [
      {
        title: 'Indústria e logística',
        description: 'Operações que dependem de cadeia fria estável.',
      },
      {
        title: 'Varejo e food service',
        description: 'Ambientes comerciais com exigência de continuidade.',
      },
      {
        title: 'Engenharia e facilities',
        description: 'Times técnicos responsáveis por ativos de refrigeração.',
      },
    ],
    primaryCta: { label: 'Conhecer a Renovação', href: 'https://renovacaorefrigeracao.com.br' },
    secondaryCta: { label: 'Ver ecossistema Omnia', href: '/empresas' },
    seo: {
      metaTitle: 'Renovação Refrigeração | Engenharia e execução técnica',
      metaDescription:
        'Braço de engenharia, projetos, instalação e manutenção do ecossistema Omnia Frigo.',
      schemaType: 'Organization',
    },
  },
  {
    slug: 'fred-do-frio-academy',
    portalSlug: 'fred-do-frio',
    name: 'Fred do Frio',
    shortDescription: 'Educação moderna e especialização profissional em refrigeração.',
    positioning: 'Braço de educação moderna e especialização profissional em refrigeração.',
    ecosystemRole: 'Educação',
    brandTheme: 'fred',
    displayOrder: 2,
    externalSite: 'https://freddofrio.com.br',
    institutionalText:
      'A Fred do Frio forma profissionais, técnicos e empreendedores unindo teoria, prática, tecnologia e proximidade com o mercado de refrigeração.',
    mission:
      'Formar pessoas preparadas para atuar com excelência técnica e visão de negócio em refrigeração.',
    vision: 'Ser a referência em educação moderna e especialização aplicada ao setor de frio.',
    values: [
      {
        title: 'Prática com propósito',
        description: 'Aprendizado conectado a situações reais de campo.',
      },
      {
        title: 'Acessibilidade moderna',
        description: 'Formatos presenciais, EAD e treinamentos in company.',
      },
      {
        title: 'Comunidade',
        description: 'Mentorias, eventos e rede de profissionais.',
      },
    ],
    differentiators: [
      {
        title: 'Educação aplicada',
        description: 'Conteúdo técnico com linguagem moderna e prática.',
      },
      {
        title: 'Especialização em refrigeração',
        description: 'Cursos e trilhas focadas no setor de frio.',
      },
      {
        title: 'Integração com o ecossistema',
        description: 'Conecta formação à engenharia, normas e tecnologia.',
      },
    ],
    authorityStats: [
      { value: 'EAD+', label: 'prática presencial' },
      { value: 'In company', label: 'treinamentos sob medida' },
      { value: 'Comunidade', label: 'mentorias e eventos' },
    ],
    offerings: [
      { title: 'Cursos livres e técnicos', kind: 'course' },
      { title: 'Refrigeração industrial', kind: 'course' },
      { title: 'Câmara fria', kind: 'course' },
      { title: 'Split', kind: 'course' },
      { title: 'Carga térmica', kind: 'course' },
      { title: 'Chiller', kind: 'course' },
      { title: 'Boas práticas de campo', kind: 'course' },
      { title: 'EAD com prática presencial', kind: 'course' },
      { title: 'Treinamentos in company', kind: 'service' },
      { title: 'Mentorias, eventos e comunidade', kind: 'service' },
    ],
    audiences: [
      {
        title: 'Profissionais em formação',
        description: 'Quem busca especialização e empregabilidade no setor.',
      },
      {
        title: 'Técnicos em atividade',
        description: 'Atualização e aprofundamento para o dia a dia de campo.',
      },
      {
        title: 'Empresas e empreendedores',
        description: 'Capacitação de equipes e desenvolvimento de negócios.',
      },
    ],
    primaryCta: { label: 'Conhecer a Fred do Frio', href: 'https://freddofrio.com.br' },
    secondaryCta: { label: 'Ver ecossistema Omnia', href: '/empresas' },
    seo: {
      metaTitle: 'Fred do Frio | Educação moderna em refrigeração',
      metaDescription:
        'Braço de educação moderna e especialização profissional do ecossistema Omnia Frigo.',
      schemaType: 'Organization',
    },
  },
  {
    slug: 'cte',
    portalSlug: 'cte',
    name: 'CTE',
    shortDescription: 'Base histórica de formação técnica, normativa e industrial do grupo.',
    positioning: 'Base histórica de formação técnica, normativa e industrial do grupo.',
    ecosystemRole: 'Formação Técnica',
    brandTheme: 'cte',
    displayOrder: 3,
    externalSite: 'https://escolacte.com.br',
    institutionalText:
      'O CTE é a base histórica de formação técnica do ecossistema Omnia Frigo, com trajetória em capacitação industrial, elétrica, mecânica e normas regulamentadoras.',
    mission:
      'Formar profissionais técnicos com domínio normativo e industrial para a indústria brasileira.',
    vision:
      'Manter-se como referência histórica e técnica em formação industrial e segurança normativa.',
    values: [
      {
        title: 'Rigor técnico',
        description: 'Conteúdo alinhado a práticas industriais e requisitos normativos.',
      },
      {
        title: 'Histórico sólido',
        description: 'Tradição de formação desde 2000.',
      },
      {
        title: 'Segurança e conformidade',
        description: 'Ênfase em NRs e ambientes industriais.',
      },
    ],
    differentiators: [
      {
        title: 'Base normativa',
        description: 'Formação em NRs e práticas industriais essenciais.',
      },
      {
        title: 'Ampla cobertura técnica',
        description: 'Elétrica, mecânica, automação, solda e sistemas industriais.',
      },
      {
        title: 'Histórico com empresas',
        description: 'Treinamentos para instituições e operações industriais.',
      },
    ],
    authorityStats: [
      { value: '2000', label: 'ano de fundação' },
      { value: '+7.000', label: 'alunos formados' },
      { value: 'Industrial', label: 'treinamentos corporativos' },
    ],
    offerings: [
      { title: 'Elétrica', kind: 'course' },
      { title: 'Comandos elétricos', kind: 'course' },
      { title: 'CLP', kind: 'course' },
      { title: 'Eletrônica', kind: 'course' },
      { title: 'Mecânica', kind: 'course' },
      { title: 'Solda', kind: 'course' },
      { title: 'Pneumática', kind: 'course' },
      { title: 'Hidráulica', kind: 'course' },
      { title: 'NR-5', kind: 'course' },
      { title: 'NR-12', kind: 'course' },
      { title: 'NR-13', kind: 'course' },
      { title: 'NR-33', kind: 'course' },
      { title: 'NR-35', kind: 'course' },
    ],
    audiences: [
      {
        title: 'Indústria e manutenção',
        description: 'Times que precisam de formação técnica e conformidade.',
      },
      {
        title: 'Profissionais industriais',
        description: 'Capacitação em elétrica, mecânica e automação.',
      },
      {
        title: 'Instituições e empresas',
        description: 'Treinamentos corporativos e programas técnicos.',
      },
    ],
    primaryCta: { label: 'Conhecer o CTE', href: 'https://escolacte.com.br' },
    secondaryCta: { label: 'Ver ecossistema Omnia', href: '/empresas' },
    seo: {
      metaTitle: 'CTE | Formação técnica, normativa e industrial',
      metaDescription: 'Base histórica de formação técnica e normativa do ecossistema Omnia Frigo.',
      schemaType: 'Organization',
    },
  },
  {
    slug: 'neurofrigo',
    portalSlug: 'neurofrigo',
    name: 'Neurofrigo Command IA',
    shortDescription:
      'Automação, dados, monitoramento e inteligência artificial aplicada à refrigeração.',
    positioning: 'Braço de tecnologia, automação, dados e IA aplicada à refrigeração.',
    ecosystemRole: 'Tecnologia',
    brandTheme: 'neurofrigo',
    displayOrder: 4,
    externalSite: 'https://neurofrigo.com.br',
    institutionalText:
      'A Neurofrigo Command IA desenvolve monitoramento, automação e inteligência aplicada para elevar confiabilidade, eficiência energética e previsibilidade de sistemas de refrigeração.',
    mission: 'Transformar dados de operação em decisões melhores para sistemas de frio.',
    vision: 'Ser a plataforma de referência em IA e confiabilidade para refrigeração industrial.',
    values: [
      {
        title: 'Dados com propósito',
        description: 'Telemetria e indicadores a serviço da operação.',
      },
      {
        title: 'Confiabilidade',
        description: 'Manutenção preditiva e redução de falhas.',
      },
      {
        title: 'Eficiência',
        description: 'Otimização energética com inteligência aplicada.',
      },
    ],
    differentiators: [
      {
        title: 'IA aplicada ao frio',
        description: 'Modelos e automações pensados para refrigeração.',
      },
      {
        title: 'Visão executiva e técnica',
        description: 'Dashboards e diagnósticos para diferentes níveis de decisão.',
      },
      {
        title: 'Integração com ativos existentes',
        description: 'Inteligência sobre sistemas já instalados.',
      },
    ],
    authorityStats: [
      { value: 'IoT', label: 'monitoramento contínuo' },
      { value: 'IA', label: 'decisão assistida' },
      { value: '24/7', label: 'visibilidade operacional' },
    ],
    offerings: [
      { title: 'Monitoramento em tempo real', kind: 'solution' },
      { title: 'Manutenção preditiva', kind: 'solution' },
      { title: 'Otimização energética', kind: 'solution' },
      { title: 'IoT industrial', kind: 'solution' },
      { title: 'Dashboards executivos', kind: 'product' },
      { title: 'Diagnóstico de eficiência', kind: 'service' },
      { title: 'Relatórios automáticos', kind: 'product' },
      { title: 'Gestão de confiabilidade', kind: 'solution' },
      { title: 'Inteligência aplicada a sistemas existentes', kind: 'solution' },
    ],
    audiences: [
      {
        title: 'Operações industriais',
        description: 'Gestores de ativos e confiabilidade.',
      },
      {
        title: 'Engenharia e facilities',
        description: 'Times que monitoram desempenho e consumo.',
      },
      {
        title: 'Liderança executiva',
        description: 'Indicadores e previsibilidade para decisão.',
      },
    ],
    primaryCta: { label: 'Conhecer a Neurofrigo', href: 'https://neurofrigo.com.br' },
    secondaryCta: { label: 'Ver ecossistema Omnia', href: '/empresas' },
    seo: {
      metaTitle: 'Neurofrigo Command IA | Automação e IA em refrigeração',
      metaDescription:
        'Braço de tecnologia, dados e inteligência artificial do ecossistema Omnia Frigo.',
      schemaType: 'Organization',
    },
  },
];

export const holdingPortalCompanyDefaults = {
  slug: 'omnia-frigo-holding',
  portalSlug: 'omnia',
  isHolding: true,
  showInEcosystem: false,
  brandTheme: 'omnia' as const,
  positioning: 'Estratégia, integração e expansão do ecossistema Omnia Frigo.',
  ecosystemRole: 'Holding',
};
