import Link from 'next/link';

import { Container } from '@omnia/ui';

const NAV_ITEMS = [
  { href: '#ecossistema', label: 'Ecossistema' },
  { href: '#empresas', label: 'Empresas' },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-omnia-deep-blue/40 bg-omnia-graphite text-omnia-white">
      <Container className="py-10 md:py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl space-y-3">
            <p className="font-heading text-lg font-semibold tracking-tight">Omnia Frigo Holding</p>
            <p className="text-sm leading-relaxed text-omnia-graphite-light">
              Tradição, Educação e Inteligência Artificial em Refrigeração.
            </p>
          </div>

          <nav aria-label="Rodapé" className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-omnia-white/80 transition-colors hover:text-omnia-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-copper focus-visible:ring-offset-2 focus-visible:ring-offset-omnia-graphite motion-reduce:transition-none"
              >
                {item.label}
              </Link>
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
