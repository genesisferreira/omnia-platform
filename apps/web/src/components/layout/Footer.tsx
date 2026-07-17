import { Container } from '@omnia/ui';

import { InstitutionalNavLink } from './InstitutionalNavLink';
import { INSTITUTIONAL_NAV_ITEMS } from './nav-items';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-omnia-deep-blue/50 bg-omnia-graphite text-omnia-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-omnia-copper/45 to-transparent"
      />
      <Container className="py-10 md:py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl space-y-3">
            <p className="font-heading text-lg font-semibold tracking-tight">Omnia Frigo Holding</p>
            <p className="text-sm leading-relaxed text-omnia-graphite-light">
              Tradição, Educação e Inteligência Artificial em Refrigeração.
            </p>
          </div>

          <nav aria-label="Rodapé" className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            {INSTITUTIONAL_NAV_ITEMS.map((item) => (
              <InstitutionalNavLink
                key={item.href}
                href={item.href}
                className="text-sm text-omnia-white/80 transition-colors hover:text-omnia-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-copper focus-visible:ring-offset-2 focus-visible:ring-offset-omnia-graphite motion-reduce:transition-none"
              >
                {item.label}
              </InstitutionalNavLink>
            ))}
          </nav>
        </div>

        <p className="mt-8 border-t border-white/10 pt-6 text-sm text-omnia-graphite-light">
          © {year} Omnia Frigo Holding
        </p>
      </Container>
    </footer>
  );
}
