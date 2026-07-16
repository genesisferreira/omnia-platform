import type { PublicFeaturesBlockDto } from '@omnia/shared';
import { Container, SectionTitle } from '@omnia/ui';

const FALLBACK_ITEMS = [
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
] as const;

const columnClass: Record<PublicFeaturesBlockDto['columns'], string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
};

type FeaturesSectionProps = {
  block?: PublicFeaturesBlockDto;
};

/**
 * Seção de features / ecossistema.
 * Sem `block` → fallback institucional (Home segura).
 */
export function FeaturesSection({ block }: FeaturesSectionProps = {}) {
  const title = block?.title ?? 'Um ecossistema integrado';
  const subtitle =
    block?.subtitle ??
    'A Omnia Frigo Holding conecta holding, serviços, tecnologia, educação e engenharia em uma única plataforma.';
  const items = block?.items ?? FALLBACK_ITEMS;
  const columns = block?.columns ?? 3;

  return (
    <section id="ecossistema" className="py-16 md:py-24">
      <Container>
        <SectionTitle title={title} subtitle={subtitle ?? undefined} />
        <div className={`mt-10 grid gap-6 ${columnClass[columns]}`}>
          {items.map((item) => (
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

/** @deprecated Use FeaturesSection — alias de compatibilidade. */
export const EcosystemSection = FeaturesSection;
