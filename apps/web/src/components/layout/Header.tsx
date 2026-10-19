'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import { Container } from '@omnia/ui';

import { AccountNav } from './AccountNav';
import { BrandHomeLink } from './BrandHomeLink';
import { InstitutionalNavLink } from './InstitutionalNavLink';
import { INSTITUTIONAL_NAV_ITEMS } from './nav-items';
import {
  isFocusLeavingContainer,
  isPointerOutsideContainer,
  shouldAlignMenuRight,
  toggleOpenMenu,
} from './partners-menu';

const PANEL_WIDTH_PX = 240;

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [alignRight, setAlignRight] = useState(false);
  const baseId = useId();
  const menuId = `${baseId}-mobile`;
  const containers = useRef(new Map<string, HTMLDivElement>());
  const triggers = useRef(new Map<string, HTMLButtonElement>());

  // Navegação concluída: nada fica preso aberto.
  useEffect(() => {
    setOpenKey(null);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen && !openKey) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (openKey) {
        triggers.current.get(openKey)?.focus();
        setOpenKey(null);
      }
      setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, openKey]);

  useEffect(() => {
    if (!openKey) return;
    const onPointerDown = (event: PointerEvent) => {
      if (isPointerOutsideContainer(containers.current.get(openKey) ?? null, event.target)) {
        setOpenKey(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [openKey]);

  // Posição estável: decide o alinhamento antes da pintura para o painel não "pular".
  useLayoutEffect(() => {
    if (!openKey) return;
    const trigger = triggers.current.get(openKey);
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setAlignRight(shouldAlignMenuRight(rect.left, PANEL_WIDTH_PX, window.innerWidth));
  }, [openKey]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (media.matches) setMenuOpen(false);
      else setOpenKey(null);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const focusFirstLink = (key: string) => {
    requestAnimationFrame(() => {
      containers.current.get(key)?.querySelector<HTMLAnchorElement>('[role="group"] a')?.focus();
    });
  };

  return (
    <header className="relative sticky top-0 z-50 border-b border-omnia-deep-blue/10 bg-omnia-white/95 backdrop-blur supports-[backdrop-filter]:bg-omnia-white/90">
      <Container className="flex h-16 items-center justify-between gap-3">
        <BrandHomeLink />

        <nav aria-label="Principal" className="hidden items-center gap-7 md:flex">
          {INSTITUTIONAL_NAV_ITEMS.map((item, index) => {
            if (!item.children) {
              return (
                <InstitutionalNavLink
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-omnia-graphite-light transition-colors hover:text-omnia-deep-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald focus-visible:ring-offset-2 motion-reduce:transition-none"
                >
                  {item.label}
                </InstitutionalNavLink>
              );
            }
            const key = item.href;
            const panelId = `${baseId}-menu-${index}`;
            const open = openKey === key;
            return (
              <div
                key={key}
                ref={(node) => {
                  if (node) containers.current.set(key, node);
                  else containers.current.delete(key);
                }}
                className="relative"
                onBlur={(event) => {
                  if (
                    open &&
                    isFocusLeavingContainer(
                      containers.current.get(key) ?? null,
                      event.relatedTarget,
                    )
                  ) {
                    setOpenKey(null);
                  }
                }}
              >
                <button
                  ref={(node) => {
                    if (node) triggers.current.set(key, node);
                    else triggers.current.delete(key);
                  }}
                  type="button"
                  className={`inline-flex items-center gap-1 text-sm font-medium transition-colors hover:text-omnia-deep-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald focus-visible:ring-offset-2 ${open ? 'text-omnia-deep-blue' : 'text-omnia-graphite-light'}`}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenKey((current) => toggleOpenMenu(current, key))}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      setOpenKey(key);
                      focusFirstLink(key);
                    }
                  }}
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={`text-[0.6rem] transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
                  >
                    ▼
                  </span>
                </button>
                <div
                  id={panelId}
                  role="group"
                  aria-label={item.label}
                  hidden={!open}
                  style={{ width: PANEL_WIDTH_PX }}
                  className={`absolute top-full z-50 mt-2 rounded-md border border-omnia-deep-blue/10 bg-omnia-white py-2 shadow-lg ${alignRight ? 'right-0' : 'left-0'}`}
                >
                  {item.children.map((child) => (
                    <InstitutionalNavLink
                      key={child.href}
                      href={child.href}
                      className={`block px-4 py-2 text-sm hover:bg-omnia-emerald/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-omnia-emerald ${child.highlight ? 'font-semibold text-omnia-emerald' : 'text-omnia-deep-blue'}`}
                      onClick={() => setOpenKey(null)}
                    >
                      {child.label}
                    </InstitutionalNavLink>
                  ))}
                </div>
              </div>
            );
          })}
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
        className={`max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-omnia-deep-blue/10 bg-omnia-white md:hidden ${menuOpen ? 'block' : 'hidden'}`}
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
                      onClick={() => setMenuOpen(false)}
                      className={`rounded-md px-3 py-3 text-sm font-medium hover:bg-omnia-emerald/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald ${child.highlight ? 'text-omnia-emerald' : 'text-omnia-deep-blue'}`}
                    >
                      {child.label}
                    </InstitutionalNavLink>
                  ))}
                </div>
              ) : (
                <InstitutionalNavLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
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
