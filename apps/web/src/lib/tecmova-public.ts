import type { PublicCompanyDto, PublicCompanyListItemDto } from '@omnia/shared';

/** Slug público. O identificador interno da escola continua `cte`. */
export const TECMOVA_PUBLIC_SLUG = 'tecmova';
export const TECMOVA_INTERNAL_SLUG = 'cte';
export const TECMOVA_NAME = 'TECMOVA';
export const TECMOVA_SLOGAN = 'Conhecimento que transforma. Tecnologia que impulsiona.';
export const TECMOVA_SITE = 'https://tecmova.com.br';
export const TECMOVA_LOGO_PATH = '/brand/tecmova-conceito-02.jpg';
export const TECMOVA_SIGNATURE = 'Educação, tecnologia e inteligência artificial';

/** Textos do perfil institucional de outubro de 2026. Sem a leitura de “cinco anos” como idade da empresa. */
const TECMOVA_INSTITUTIONAL =
  'A TECMOVA é uma empresa de educação, tecnologia e inteligência artificial. Oferecemos cursos, treinamentos corporativos, consultoria e desenvolvimento de soluções digitais para ajudar pessoas e empresas a aprender, inovar e transformar conhecimento em resultados.';

const TECMOVA_MISSION =
  'Capacitar pessoas e apoiar empresas na aplicação prática de tecnologia e inteligência artificial, oferecendo educação de qualidade, consultoria responsável e soluções digitais que gerem valor real.';

const TECMOVA_VISION =
  'Ser reconhecida como referência em formação tecnológica aplicada e transformação digital acessível, conectando conhecimento, pessoas e empresas em diferentes setores do mercado brasileiro.';

const TECMOVA_DESCRIPTION = `${TECMOVA_SLOGAN} ${TECMOVA_INSTITUTIONAL}`;

type IdentityFields = {
  slug?: string;
  portalSlug?: string;
  name?: string;
  shortDescription?: string;
  positioning?: string | null;
  ecosystemRole?: string;
  externalSite?: string | null;
  logo?: { url: string; alt: string | null } | null;
  coverImage?: { url: string; alt: string | null } | null;
  primaryCta?: { label: string; href: string } | null;
};

export function isInternalTecmovaSlug(slug: string | null | undefined): boolean {
  return (slug ?? '').trim().toLowerCase() === TECMOVA_INTERNAL_SLUG;
}

export function publicCompanySitemapSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  return normalized === TECMOVA_INTERNAL_SLUG ? TECMOVA_PUBLIC_SLUG : normalized;
}

export function shouldPresentAsTecmova(company: {
  slug?: string | null;
  portalSlug?: string | null;
}): boolean {
  return isInternalTecmovaSlug(company.slug) || isInternalTecmovaSlug(company.portalSlug);
}

function presentIdentity<T extends IdentityFields>(company: T): T {
  if (!shouldPresentAsTecmova(company)) return company;
  return {
    ...company,
    name: TECMOVA_NAME,
    portalSlug: TECMOVA_PUBLIC_SLUG,
    shortDescription: TECMOVA_SLOGAN,
    positioning: TECMOVA_SLOGAN,
    ecosystemRole: TECMOVA_SIGNATURE,
    externalSite: TECMOVA_SITE,
    logo: { url: TECMOVA_LOGO_PATH, alt: TECMOVA_NAME },
    coverImage: null,
    primaryCta: { label: 'Conhecer a TECMOVA', href: TECMOVA_SITE },
  };
}

export function presentTecmovaListItem<T extends PublicCompanyListItemDto>(company: T): T {
  return presentIdentity(company);
}

export function presentTecmovaCompany(company: PublicCompanyDto): PublicCompanyDto {
  if (!shouldPresentAsTecmova(company)) return company;
  const listed = presentTecmovaListItem(company);
  return {
    ...company,
    ...listed,
    institutionalText: `${TECMOVA_INSTITUTIONAL} ${TECMOVA_SLOGAN}`,
    mission: TECMOVA_MISSION,
    vision: TECMOVA_VISION,
    values: [
      {
        title: 'Clareza e acessibilidade',
        description: 'Explicar temas complexos de forma simples e útil.',
      },
      {
        title: 'Aprendizado contínuo',
        description: 'Acompanhar a evolução tecnológica e compartilhar conhecimento.',
      },
      {
        title: 'Ética e responsabilidade',
        description:
          'Usar inteligência artificial com transparência, segurança e respeito aos dados.',
      },
      {
        title: 'Prática e resultado',
        description: 'Priorizar soluções aplicáveis, mensuráveis e sustentáveis.',
      },
      {
        title: 'Parceria',
        description:
          'Ouvir, orientar e desenvolver soluções alinhadas à realidade de cada cliente.',
      },
      {
        title: 'Inovação com propósito',
        description: 'Adotar tecnologia para resolver problemas reais.',
      },
    ],
    differentiators: [
      {
        title: 'Ensino, consultoria e implantação',
        description: 'Visão integrada de educação, consultoria e implantação tecnológica.',
      },
      {
        title: 'Comunicação clara',
        description: 'Linguagem acessível para quem está começando e para quem já atua na área.',
      },
      {
        title: 'Aplicação responsável',
        description:
          'A inteligência artificial apoia criatividade, análise e produtividade, com revisão humana nas tarefas críticas.',
      },
    ],
    authorityStats: [],
    offerings: [
      {
        title: 'Educação',
        description:
          'Aprendizagem para iniciantes, profissionais técnicos, equipes e lideranças, com conceitos, demonstrações e aplicações próximas da rotina.',
        kind: 'service' as const,
      },
      {
        title: 'Treinamentos corporativos',
        description:
          'Programas sob medida para preparar profissionais para novas ferramentas e processos, a partir do diagnóstico da equipe.',
        kind: 'service' as const,
      },
      {
        title: 'Consultoria',
        description:
          'Diagnóstico, planejamento e acompanhamento de projetos de transformação digital e inteligência artificial.',
        kind: 'service' as const,
      },
      {
        title: 'Tecnologia e soluções digitais',
        description:
          'Agentes de inteligência artificial, automações, sistemas web, portais e integração entre ferramentas, conforme o projeto.',
        kind: 'solution' as const,
      },
    ],
    audiences: [],
    gallery: [],
    secondaryCta:
      company.secondaryCta && !/escolacte\.com\.br/i.test(company.secondaryCta.href)
        ? company.secondaryCta
        : { label: 'Ver ecossistema Omnia', href: '/empresas' },
    seo: {
      ...company.seo,
      metaTitle: `${TECMOVA_NAME} | ${TECMOVA_SLOGAN}`,
      metaDescription: TECMOVA_DESCRIPTION,
      canonicalUrl: null,
      noIndex: false,
      openGraphTitle: TECMOVA_NAME,
      openGraphDescription: `${TECMOVA_SLOGAN} ${TECMOVA_DESCRIPTION}`,
      openGraphImage: { url: TECMOVA_LOGO_PATH, alt: TECMOVA_NAME },
      schemaType: 'Organization',
    },
    siblings: company.siblings.map(presentTecmovaListItem),
  };
}

/** Página institucional quando o CMS não devolve a empresa interna. Não grava banco. */
export function tecmovaFallbackCompany(): PublicCompanyDto {
  const base: PublicCompanyDto = {
    id: 'tecmova-public',
    name: TECMOVA_INTERNAL_SLUG,
    slug: TECMOVA_INTERNAL_SLUG,
    portalSlug: TECMOVA_INTERNAL_SLUG,
    shortDescription: '',
    positioning: null,
    ecosystemRole: '',
    brandTheme: 'cte',
    displayOrder: 3,
    externalSite: null,
    applicationUrl: null,
    logo: null,
    coverImage: null,
    primaryCta: null,
    institutionalText: null,
    mission: null,
    vision: null,
    values: [],
    differentiators: [],
    authorityStats: [],
    offerings: [],
    audiences: [],
    gallery: [],
    secondaryCta: null,
    seo: {
      metaTitle: null,
      metaDescription: null,
      canonicalUrl: null,
      noIndex: false,
      noFollow: false,
      openGraphTitle: null,
      openGraphDescription: null,
      openGraphImage: null,
      schemaType: 'Organization',
    },
    siblings: [],
  };
  return presentTecmovaCompany(base);
}
