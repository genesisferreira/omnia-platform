import type { PublicHeroBlockDto } from '@omnia/shared';
import { Button, Container } from '@omnia/ui';

import type { CmsGlobalSettings } from '@/lib/cms';

type HeroFromSettingsProps = {
  settings: CmsGlobalSettings | null;
  block?: never;
};

type HeroFromBlockProps = {
  block: PublicHeroBlockDto;
  settings?: never;
};

type HeroProps = HeroFromSettingsProps | HeroFromBlockProps;

const variantPadding: Record<PublicHeroBlockDto['variant'], string> = {
  default: 'py-24 md:py-32 lg:py-36',
  compact: 'py-16 md:py-20',
  emphasis: 'py-28 md:py-40',
};

export function Hero(props: HeroProps) {
  const title =
    'block' in props && props.block
      ? props.block.title
      : (props.settings?.heroTitle ?? 'Ecossistema Omnia Frigo Holding');
  const subtitle =
    'block' in props && props.block
      ? (props.block.subtitle ?? '')
      : (props.settings?.heroSubtitle ??
        'Tradição, Educação e Inteligência Artificial em Refrigeração.');
  const primary =
    'block' in props && props.block
      ? props.block.primaryAction
      : {
          label: props.settings?.ctaLabel ?? 'Conheça o ecossistema',
          href: props.settings?.ctaUrl ?? '#ecossistema',
        };
  const secondary = 'block' in props && props.block ? props.block.secondaryAction : null;
  const eyebrow = 'block' in props && props.block ? props.block.eyebrow : null;
  const variant = 'block' in props && props.block ? props.block.variant : ('default' as const);

  return (
    <section
      className={`relative isolate overflow-hidden bg-omnia-deep-blue text-omnia-white ${variantPadding[variant]}`}
    >
      {/* Base institucional: azul → esmeralda */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-omnia-deep-blue via-omnia-deep-blue to-omnia-emerald"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-omnia-emerald/40 via-transparent to-transparent"
      />

      {/* Iluminação sutil */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-0 h-[28rem] w-[28rem] rounded-full bg-omnia-emerald/25 blur-3xl motion-reduce:blur-none"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 bottom-0 h-[22rem] w-[22rem] rounded-full bg-omnia-copper/15 blur-3xl motion-reduce:blur-none"
      />

      {/* Grid técnico discreto */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 75% 70% at 30% 40%, black 20%, transparent 75%)',
        }}
      />

      {/* Forma geométrica de apoio */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 top-1/2 hidden h-[120%] w-[42%] -translate-y-1/2 border-l border-white/10 bg-gradient-to-l from-white/[0.06] to-transparent md:block"
        style={{ clipPath: 'polygon(18% 0, 100% 0, 100% 100%, 0 100%)' }}
      />

      <Container className="relative z-10">
        <div className="max-w-3xl space-y-7">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-omnia-white/70 md:text-sm">
              {eyebrow}
            </p>
          ) : null}

          <div className="space-y-5">
            <h1 className="font-heading text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl">
              {title}
            </h1>
            <div
              aria-hidden="true"
              className="h-0.5 w-16 bg-gradient-to-r from-omnia-copper to-omnia-copper/30"
            />
            {subtitle ? (
              <p className="max-w-2xl text-base leading-relaxed text-omnia-white/85 md:text-xl md:leading-relaxed">
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            {primary ? (
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="bg-omnia-white text-omnia-deep-blue shadow-none transition-colors hover:bg-omnia-white/95 focus-visible:ring-omnia-copper motion-reduce:transition-none"
              >
                <a href={primary.href}>{primary.label}</a>
              </Button>
            ) : null}
            {secondary ? (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-omnia-white/35 bg-transparent text-omnia-white hover:bg-omnia-white/10 focus-visible:ring-omnia-copper motion-reduce:transition-none"
              >
                <a href={secondary.href}>{secondary.label}</a>
              </Button>
            ) : null}
          </div>
        </div>
      </Container>

      {/* Linha de base institucional */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-omnia-copper/50 to-transparent"
      />
    </section>
  );
}
