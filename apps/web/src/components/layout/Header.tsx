'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { Container } from '@omnia/ui';

import { AccountNav } from './AccountNav';
import { BrandHomeLink } from './BrandHomeLink';
import { InstitutionalNavLink } from './InstitutionalNavLink';
import { INSTITUTIONAL_NAV_ITEMS } from './nav-items';
import { isFocusLeavingContainer, isPointerOutsideContainer } from './partners-menu';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [partnersOpen, setPartnersOpen] = useState(false);
  const menuId = useId();
  const partnersId = useId();
  const partnersDesktopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen && !partnersOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setPartnersOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, partnersOpen]);

  useEffect(() => {
    if (!partnersOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (isPointerOutsideContainer(partnersDesktopRef.current, event.target)) {
        setPartnersOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [partnersOpen]);

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

  const closeMenu = () => {
    setMenuOpen(false);
    setPartnersOpen(false);
  };

  return (
    <header className="relative sticky top-0 z-50 border-b border-omnia-deep-blue/10 bg-omnia-white/95 backdrop-blur supports-[backdrop-filter]:bg-omnia-white/90">
      <Container className="flex h-16 items-center justify-between gap-3">
        <BrandHomeLink />

        <nav aria-label="Principal" className="hidden items-center gap-7 md:flex">
          {INSTITUTIONAL_NAV_ITEMS.map((item) =>
            item.children ? (
              <div
                key={item.href}
                ref={partnersDesktopRef}
                className="relative"
                onBlur={(event) => {
                  if (isFocusLeavingContainer(partnersDesktopRef.current, event.relatedTarget)) {
                    setPartnersOpen(false);
                  }
                }}
              >
                <button
                  type="button"
                  className="text-sm font-medium text-omnia-graphite-light transition-colors hover:text-omnia-deep-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald focus-visible:ring-offset-2"
                  aria-expanded={partnersOpen}
                  aria-controls={partnersId}
                  aria-haspopup="true"
                  onClick={() => setPartnersOpen((open) => !open)}
                >
                  {item.label}
                </button>
                {partnersOpen ? (
                  <div
                    id={partnersId}
                    role="group"
                    aria-label={item.label}
                    className="absolute left-0 top-full z-50 mt-2 min-w-[12rem] border border-omnia-deep-blue/10 bg-omnia-white py-2 shadow-md"
                  >
                    {item.children.map((child) => (
                      <InstitutionalNavLink
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2 text-sm text-omnia-deep-blue hover:bg-omnia-emerald/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald focus-visible:ring-inset"
                        onClick={() => setPartnersOpen(false)}
                      >
                        {child.label}
                      </InstitutionalNavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <InstitutionalNavLink
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-omnia-graphite-light transition-colors hover:text-omnia-deep-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                {item.label}
              </InstitutionalNavLink>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <AccountNav className="hidden border-omnia-deep-blue/20 text-omnia-deep-blue hover:bg-omnia-deep-blue/5 md:inline-flex" />

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-omnia-deep-blue/15 text-omnia-deep-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald focus-visible:ring-offset-2 md:hidden"
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
        className={`border-t border-omnia-deep-blue/10 bg-omnia-white md:hidden ${menuOpen ? 'block' : 'hidden'}`}
        hidden={!menuOpen}
      >
        <Container className="flex flex-col gap-1 py-3">
          <nav aria-label="Principal mobile" className="flex flex-col gap-1">
            {INSTITUTIONAL_NAV_ITEMS.map((item) =>
              item.children ? (
                <div key={item.href} className="flex flex-col">
                  <span className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-omnia-graphite-light">
                    {item.label}
                  </span>
                  {item.children.map((child) => (
                    <InstitutionalNavLink
                      key={child.href}
                      href={child.href}
                      onClick={closeMenu}
                      className="rounded-md px-3 py-3 text-sm font-medium text-omnia-deep-blue hover:bg-omnia-emerald/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald"
                    >
                      {child.label}
                    </InstitutionalNavLink>
                  ))}
                </div>
              ) : (
                <InstitutionalNavLink
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className="rounded-md px-3 py-3 text-sm font-medium text-omnia-deep-blue hover:bg-omnia-emerald/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald"
                >
                  {item.label}
                </InstitutionalNavLink>
              ),
            )}
          </nav>
          <div className="px-3 pt-2">
            <AccountNav className="w-full border-omnia-deep-blue/20 text-omnia-deep-blue" />
          </div>
        </Container>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-omnia-copper/40 to-transparent"
      />
    </header>
  );
}
