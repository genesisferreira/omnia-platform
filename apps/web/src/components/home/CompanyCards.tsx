import type { PublicCompaniesBlockDto } from '@omnia/shared';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  SectionTitle,
} from '@omnia/ui';

import type { CmsCompany } from '@/lib/cms';
import { fetchCompanies } from '@/lib/cms';

type CompanyCardsProps = {
  companies: CmsCompany[];
  title?: string | null;
  subtitle?: string | null;
  showRole?: boolean;
  showDescription?: boolean;
  layout?: PublicCompaniesBlockDto['layout'];
};

export function CompanyCards({
  companies,
  title = 'Empresas do ecossistema',
  subtitle = 'Conheça as marcas que compõem a Omnia Frigo Holding.',
  showRole = true,
  showDescription = true,
  layout = 'grid',
}: CompanyCardsProps) {
  const gridClass =
    layout === 'list'
      ? 'mt-10 grid gap-4 md:grid-cols-1'
      : 'mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section id="empresas" className="bg-muted/40 py-16 md:py-24">
      <Container>
        <SectionTitle
          title={title ?? 'Empresas do ecossistema'}
          subtitle={subtitle ?? undefined}
          align="center"
        />
        {companies.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">
            Nenhuma empresa cadastrada ainda. Execute o seed no admin ou cadastre via Payload CMS.
          </p>
        ) : (
          <div className={gridClass}>
            {companies.map((company) => (
              <Card key={company.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    {showRole ? <Badge variant="secondary">{company.ecosystemRole}</Badge> : null}
                  </div>
                  {showDescription ? (
                    <CardDescription>{company.shortDescription}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="mt-auto">
                  {company.externalSite ? (
                    <a
                      href={company.externalSite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Visitar site →
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">Site em breve</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

type CompaniesBlockProps = {
  block: PublicCompaniesBlockDto;
};

/** Busca empresas via endpoint público existente (não REST Companies). */
export async function CompaniesBlockView({ block }: CompaniesBlockProps) {
  const companies = await fetchCompanies(block.limit);
  return (
    <CompanyCards
      companies={companies}
      title={block.title}
      subtitle={block.subtitle}
      showRole={block.showRole}
      showDescription={block.showDescription}
      layout={block.layout}
    />
  );
}
