import type { PublicCompanyDto, PublicCompanyListItemDto } from '@omnia/shared';

/** Slug público. O identificador interno da escola continua `cte`. */
export const TECMOVA_PUBLIC_SLUG = 'tecmova';
export const TECMOVA_INTERNAL_SLUG = 'cte';
export const TECMOVA_NAME = 'TECMOVA';
export const TECMOVA_SLOGAN = 'Conhecimento que transforma. Tecnologia que impulsiona.';
export const TECMOVA_SITE = 'https://tecmova.com.br';

export const TECMOVA_ACTIVITIES = [
  'Educação',
  'Inteligência artificial',
  'Tecnologia',
  'Treinamentos',
  'Consultoria empresarial',
  'Transformação digital',
  'Automações',
  'Desenvolvimento de soluções tecnológicas',
] as const;

const TECMOVA_DESCRIPTION =
  'Educação, inteligência artificial, tecnologia, treinamentos, consultoria empresarial, transformação digital, automações e desenvolvimento de soluções tecnológicas.';

const TECMOVA_INSTITUTIONAL = `A TECMOVA atua em ${TECMOVA_DESCRIPTION.charAt(0).toLowerCase()}${TECMOVA_DESCRIPTION.slice(1, -1)}. ${TECMOVA_SLOGAN}`;

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
    ecosystemRole: 'Educação e tecnologia',
    externalSite: TECMOVA_SITE,
    logo: null,
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
    institutionalText: TECMOVA_INSTITUTIONAL,
    mission: null,
    vision: null,
    values: [],
    differentiators: [],
    authorityStats: [],
    offerings: TECMOVA_ACTIVITIES.map((title) => ({
      title,
      description: null,
      kind: 'service' as const,
    })),
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
      openGraphImage: null,
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
