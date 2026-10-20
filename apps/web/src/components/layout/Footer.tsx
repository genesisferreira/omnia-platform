import { Container } from '@omnia/ui';

import { InstitutionalNavLink } from './InstitutionalNavLink';
import { INSTITUTIONAL_NAV_ITEMS } from './nav-items';

export function Footer() {
  const year = new Date().getFullYear();

  const groups = [
    {
      title: 'Institucional',
      links: INSTITUTIONAL_NAV_ITEMS.filter((item) => !item.children).map((item) => ({
        href: item.href,
        label: item.label,
      })),
    },
    ...INSTITUTIONAL_NAV_ITEMS.filter((item) => item.children).map((item) => ({
      title: item.label,
      links: (item.children ?? []).map((child) => ({ href: child.href, label: child.label })),
    })),
  ];
  const linkClass =
    'text-sm text-omnia-white/80 transition-colors hover:text-omnia-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-copper focus-visible:ring-offset-2 focus-visible:ring-offset-omnia-graphite motion-reduce:transition-none';

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

          <nav aria-label="Rodapé" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {groups.map((group) => (
              <div key={group.title} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-omnia-white/60">
                  {group.title}
                </p>
                <ul className="space-y-2">
                  {group.links.map((item) => (
                    <li key={`${item.href}-${item.label}`}>
                      <InstitutionalNavLink href={item.href} className={linkClass}>
                        {item.label}
                      </InstitutionalNavLink>
                    </li>
                  ))}
                </ul>
              </div>
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
