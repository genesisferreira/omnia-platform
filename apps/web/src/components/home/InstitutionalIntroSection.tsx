import type { PublicInstitutionalIntroBlockDto } from '@omnia/shared';
import { Container } from '@omnia/ui';

type InstitutionalIntroSectionProps = {
  block: PublicInstitutionalIntroBlockDto;
};

export function InstitutionalIntroSection({ block }: InstitutionalIntroSectionProps) {
  return (
    <section
      id="institucional"
      className="relative border-b border-omnia-deep-blue/10 bg-omnia-white py-20 md:py-24"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-omnia-emerald/20 to-transparent"
      />

      <Container>
        <div className="mx-auto max-w-3xl text-center md:max-w-4xl">
          {block.eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-omnia-copper md:text-sm">
              {block.eyebrow}
            </p>
          ) : null}

          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-omnia-deep-blue md:text-4xl">
            {block.title}
          </h2>

          <div
            aria-hidden="true"
            className="mx-auto mt-5 h-0.5 w-12 bg-gradient-to-r from-omnia-copper to-omnia-copper/30"
          />

          <p className="mt-6 text-base leading-relaxed text-omnia-graphite-light md:text-lg md:leading-relaxed">
            {block.body}
          </p>

          {block.highlights.length > 0 ? (
            <ul className="mt-10 flex flex-wrap justify-center gap-3">
              {block.highlights.map((highlight) => (
                <li
                  key={highlight}
                  className="rounded-full border border-omnia-emerald/25 bg-omnia-emerald/[0.04] px-4 py-2 text-sm font-medium text-omnia-deep-blue"
                >
                  {highlight}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
