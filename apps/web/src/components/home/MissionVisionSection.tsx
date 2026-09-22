import type { PublicMissionVisionBlockDto } from '@omnia/shared';
import { Container } from '@omnia/ui';

type MissionVisionSectionProps = {
  block: PublicMissionVisionBlockDto;
};

export function MissionVisionSection({ block }: MissionVisionSectionProps) {
  return (
    <section className="relative bg-omnia-graphite/[0.03] py-20 md:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(14,45,77,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(14,45,77,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <Container className="relative">
        <div className="grid gap-8 md:grid-cols-2 md:gap-10">
          <article className="rounded-lg border border-omnia-deep-blue/10 bg-omnia-white p-8 shadow-[0_1px_0_rgba(14,45,77,0.04)] transition-shadow hover:shadow-[0_12px_28px_-20px_rgba(14,45,77,0.35)] motion-reduce:transition-none">
            <div className="mb-4 flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-md bg-omnia-emerald/10 text-omnia-emerald"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
                </svg>
              </span>
              <h2 className="font-heading text-xl font-semibold text-omnia-deep-blue md:text-2xl">
                {block.missionTitle}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-omnia-graphite-light md:text-base">
              {block.missionBody}
            </p>
          </article>

          <article className="rounded-lg border border-omnia-deep-blue/10 bg-omnia-white p-8 shadow-[0_1px_0_rgba(14,45,77,0.04)] transition-shadow hover:shadow-[0_12px_28px_-20px_rgba(14,45,77,0.35)] motion-reduce:transition-none">
            <div className="mb-4 flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-md bg-omnia-copper/10 text-omnia-copper"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </span>
              <div>
                <h2 className="font-heading text-xl font-semibold text-omnia-deep-blue md:text-2xl">
                  {block.visionTitle}
                </h2>
                {block.visionYear ? (
                  <p className="text-xs font-medium uppercase tracking-wider text-omnia-graphite-light">
                    {block.visionYear}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="text-sm leading-relaxed text-omnia-graphite-light md:text-base">
              {block.visionBody}
            </p>
          </article>
        </div>
      </Container>
    </section>
  );
}
