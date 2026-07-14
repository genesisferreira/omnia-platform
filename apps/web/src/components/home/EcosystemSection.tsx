import { Container, SectionTitle } from '@omnia/ui';

export function EcosystemSection() {
  return (
    <section id="ecossistema" className="py-16 md:py-24">
      <Container>
        <SectionTitle
          title="Um ecossistema integrado"
          subtitle="A Omnia Frigo Holding conecta holding, serviços, tecnologia, educação e engenharia em uma única plataforma."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'Multiempresa',
              description: 'Estrutura de tenants e empresas preparada para escalar.',
            },
            {
              title: 'CMS centralizado',
              description: 'Conteúdo gerenciado via Payload CMS no painel admin.',
            },
            {
              title: 'Design unificado',
              description: 'Identidade visual Omnia aplicada em portal e admin.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <h3 className="font-heading text-lg font-semibold text-primary">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
