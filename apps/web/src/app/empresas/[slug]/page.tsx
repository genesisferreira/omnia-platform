import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/seo/JsonLd';
import { CompanyPageView } from '@/components/companies/CompanyPageView';
import { fetchPublicCompany } from '@/lib/cms-companies';
import {
  buildBreadcrumbJsonLd,
  buildCompanyOrganizationJsonLd,
  buildNotFoundMetadata,
  buildPageMetadata,
} from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

type CompanyPageProps = {
  params: Promise<{ slug: string }>;
};

async function loadCompany(slug: string) {
  const siteContext = await getSiteContext();
  const company = await fetchPublicCompany(slug);
  return { company, hostname: siteContext.hostname };
}

export async function generateMetadata({ params }: CompanyPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim().toLowerCase();
  if (!slug) {
    return buildNotFoundMetadata();
  }

  const { company, hostname } = await loadCompany(slug);
  if (!company) {
    return buildNotFoundMetadata();
  }

  return buildPageMetadata({
    pathname: `/empresas/${company.portalSlug}`,
    title: company.name,
    description: company.positioning ?? company.shortDescription,
    seo: {
      metaTitle: company.seo.metaTitle,
      metaDescription: company.seo.metaDescription,
      canonicalUrl: company.seo.canonicalUrl,
      noIndex: company.seo.noIndex,
    },
    hostname,
    image: company.seo.openGraphImage ?? company.coverImage ?? company.logo,
  });
}

export default async function CompanyStrategicPage({ params }: CompanyPageProps) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim().toLowerCase();
  if (!slug) {
    notFound();
  }

  const { company, hostname } = await loadCompany(slug);
  if (!company) {
    notFound();
  }

  const pathname = `/empresas/${company.portalSlug}`;

  return (
    <>
      <JsonLd
        data={buildCompanyOrganizationJsonLd({
          pathname,
          name: company.name,
          description: company.positioning ?? company.shortDescription,
          url: company.externalSite,
          hostname,
        })}
      />
      <JsonLd
        data={buildBreadcrumbJsonLd({
          hostname,
          items: [
            { name: 'Início', pathname: '/' },
            { name: 'Empresas', pathname: '/empresas' },
            { name: company.name, pathname },
          ],
        })}
      />
      <CompanyPageView company={company} />
    </>
  );
}
