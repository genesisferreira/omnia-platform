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

type CompanyCardsProps = {
  companies: CmsCompany[];
};

export function CompanyCards({ companies }: CompanyCardsProps) {
  return (
    <section id="empresas" className="bg-muted/40 py-16 md:py-24">
      <Container>
        <SectionTitle
          title="Empresas do ecossistema"
          subtitle="Conheça as marcas que compõem a Omnia Frigo Holding."
          align="center"
        />
        {companies.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">
            Nenhuma empresa cadastrada ainda. Execute o seed no admin ou cadastre via Payload CMS.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <Card key={company.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    <Badge variant="secondary">{company.ecosystemRole}</Badge>
                  </div>
                  <CardDescription>{company.shortDescription}</CardDescription>
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
