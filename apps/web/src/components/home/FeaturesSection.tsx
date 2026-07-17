import type { FeaturesIconKey, PublicFeaturesBlockDto } from '@omnia/shared';
import { Container, SectionTitle } from '@omnia/ui';

import { FeatureIcon } from '@/components/home/FeatureIcon';

type FallbackItem = {
  title: string;
  description: string;
  iconKey: FeaturesIconKey;
};

const FALLBACK_ITEMS: readonly FallbackItem[] = [
  {
    title: 'Multiempresa',
    description: 'Estrutura de tenants e empresas preparada para escalar.',
    iconKey: 'multiempresa',
  },
  {
    title: 'CMS centralizado',
    description: 'Conteúdo gerenciado via Payload CMS no painel admin.',
    iconKey: 'cms',
  },
  {
    title: 'Design unificado',
    description: 'Identidade visual Omnia aplicada em portal e admin.',
    iconKey: 'design',
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
 * Seção de pilares estratégicos / features.
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
    <section id="ecossistema" className="relative scroll-mt-20 bg-omnia-white py-20 md:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-omnia-emerald/25 to-transparent"
      />

      <Container>
        <SectionTitle title={title} subtitle={subtitle ?? undefined} />

        <div className={`mt-12 grid gap-5 md:gap-6 ${columnClass[columns]}`}>
          {items.map((item) => {
            const iconKey =
              'iconKey' in item ? (item.iconKey as FeaturesIconKey | null | undefined) : undefined;

            return (
              <article
                key={item.title}
                className="group relative flex flex-col rounded-lg border border-omnia-deep-blue/10 bg-omnia-white p-6 shadow-[0_1px_0_rgba(14,45,77,0.04)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-omnia-emerald/35 hover:shadow-[0_12px_28px_-18px_rgba(14,45,77,0.35)] focus-within:border-omnia-emerald/50 focus-within:ring-2 focus-within:ring-omnia-emerald/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md border border-omnia-emerald/20 bg-omnia-emerald/5 text-omnia-emerald transition-colors group-hover:border-omnia-emerald/40 group-hover:bg-omnia-emerald/10 motion-reduce:transition-none">
                  <FeatureIcon iconKey={iconKey} />
                </div>

                <h3 className="font-heading text-lg font-semibold tracking-tight text-omnia-deep-blue">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-omnia-graphite-light">
                  {item.description}
                </p>

                <div
                  aria-hidden="true"
                  className="mt-5 h-0.5 w-8 bg-omnia-copper/70 transition-[width] duration-200 group-hover:w-12 motion-reduce:transition-none"
                />
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

/** @deprecated Use FeaturesSection — alias de compatibilidade. */
export const EcosystemSection = FeaturesSection;
