'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';

import { Button, Container } from '@omnia/ui';

import { BrandHomeLink } from './BrandHomeLink';

const NAV_ITEMS = [
  { href: '#ecossistema', label: 'Ecossistema' },
  { href: '#empresas', label: 'Empresas' },
] as const;

function AdminCta({ className }: { className?: string }) {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';

  return (
    <Button asChild size="sm" variant="outline" className={className}>
      <a href={adminUrl}>Área Admin</a>
    </Button>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (media.matches) {
        setMenuOpen(false);
      }
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Container className="flex h-16 items-center justify-between gap-3">
        <BrandHomeLink />

        <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <AdminCta className="hidden md:inline-flex" />

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true" className="flex flex-col gap-1.5">
              <span
                className={`block h-0.5 w-5 bg-current transition-transform motion-reduce:transition-none ${menuOpen ? 'translate-y-2 rotate-45' : ''}`}
              />
              <span
                className={`block h-0.5 w-5 bg-current transition-opacity motion-reduce:transition-none ${menuOpen ? 'opacity-0' : ''}`}
              />
              <span
                className={`block h-0.5 w-5 bg-current transition-transform motion-reduce:transition-none ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`}
              />
            </span>
          </button>
        </div>
      </Container>

      <div
        id={menuId}
        className={`border-t border-border bg-background md:hidden ${menuOpen ? 'block' : 'hidden'}`}
        hidden={!menuOpen}
      >
        <Container className="flex flex-col gap-1 py-3">
          <nav aria-label="Principal mobile" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="rounded-md px-3 py-3 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="px-3 pt-2">
            <AdminCta className="w-full" />
          </div>
        </Container>
      </div>
    </header>
  );
}
