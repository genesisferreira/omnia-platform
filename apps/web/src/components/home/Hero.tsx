import { Button, Container } from '@omnia/ui';

import type { CmsGlobalSettings } from '@/lib/cms';

type HeroProps = {
  settings: CmsGlobalSettings | null;
};

export function Hero({ settings }: HeroProps) {
  const title = settings?.heroTitle ?? 'Ecossistema Omnia Frigo Holding';
  const subtitle =
    settings?.heroSubtitle ?? 'Tradição, Educação e Inteligência Artificial em Refrigeração.';
  const ctaLabel = settings?.ctaLabel ?? 'Conheça o ecossistema';
  const ctaUrl = settings?.ctaUrl ?? '#ecossistema';

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-omnia-deep-blue to-omnia-emerald py-20 text-white md:py-28">
      <Container>
        <div className="max-w-3xl space-y-6">
          <h1 className="font-heading text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="text-lg text-white/85 md:text-xl">{subtitle}</p>
          <Button asChild size="lg" variant="secondary" className="bg-white text-omnia-deep-blue">
            <a href={ctaUrl}>{ctaLabel}</a>
          </Button>
        </div>
      </Container>
    </section>
  );
}
