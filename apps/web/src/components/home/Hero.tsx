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
  default: 'py-20 md:py-28',
  compact: 'py-14 md:py-16',
  emphasis: 'py-24 md:py-32',
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
      className={`relative overflow-hidden bg-gradient-to-br from-omnia-deep-blue to-omnia-emerald text-white ${variantPadding[variant]}`}
    >
      <Container>
        <div className="max-w-3xl space-y-6">
          {eyebrow ? (
            <p className="text-sm font-medium uppercase tracking-wide text-white/75">{eyebrow}</p>
          ) : null}
          <h1 className="font-heading text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            {title}
          </h1>
          {subtitle ? <p className="text-lg text-white/85 md:text-xl">{subtitle}</p> : null}
          <div className="flex flex-wrap gap-3">
            {primary ? (
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="bg-white text-omnia-deep-blue"
              >
                <a href={primary.href}>{primary.label}</a>
              </Button>
            ) : null}
            {secondary ? (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10"
              >
                <a href={secondary.href}>{secondary.label}</a>
              </Button>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
