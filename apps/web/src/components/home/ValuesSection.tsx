import type { PublicValuesBlockDto } from '@omnia/shared';
import { Container, SectionTitle } from '@omnia/ui';

import { ValueIcon } from '@/components/home/ValueIcon';

type ValuesSectionProps = {
  block: PublicValuesBlockDto;
};

export function ValuesSection({ block }: ValuesSectionProps) {
  return (
    <section className="relative border-y border-omnia-deep-blue/10 bg-omnia-white py-20 md:py-28">
      <Container>
        <SectionTitle
          title={block.title ?? 'Nossos valores'}
          subtitle={block.subtitle ?? undefined}
          align="center"
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {block.items.map((item) => (
            <article
              key={item.title}
              className="group flex flex-col rounded-lg border border-omnia-deep-blue/10 bg-omnia-white p-6 transition-[border-color,box-shadow] duration-200 hover:border-omnia-emerald/30 hover:shadow-[0_12px_28px_-20px_rgba(14,45,77,0.35)] focus-within:border-omnia-emerald/40 focus-within:ring-2 focus-within:ring-omnia-emerald/25 motion-reduce:transition-none"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-omnia-copper/25 bg-omnia-copper/5 text-omnia-copper transition-colors group-hover:border-omnia-copper/40 group-hover:bg-omnia-copper/10 motion-reduce:transition-none">
                <ValueIcon iconKey={item.iconKey} />
              </div>
              <h3 className="font-heading text-lg font-semibold tracking-tight text-omnia-deep-blue">
                {item.title}
              </h3>
              {item.description ? (
                <p className="mt-2 text-sm leading-relaxed text-omnia-graphite-light">
                  {item.description}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
