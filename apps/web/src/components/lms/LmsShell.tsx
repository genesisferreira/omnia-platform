'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Avatar, Button, cn } from '@omnia/ui';

import { logoutLmsSession, LmsSessionLifecycle } from '@/components/lms/LmsSessionLifecycle';
import { OfflineBanner } from '@/components/lms/OfflineBanner';

const NAV = [
  { href: '/lms', label: 'Dashboard', exact: true },
  { href: '/lms/continuar', label: 'Continuar' },
  { href: '/lms/cursos', label: 'Meus cursos' },
  { href: '/lms/progresso', label: 'Progresso' },
  { href: '/lms/notas', label: 'Notas' },
];

export type LmsShellProps = {
  userName: string;
  children: React.ReactNode;
};

export function LmsShell({ userName, children }: LmsShellProps) {
  const pathname = usePathname() || '/lms';
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navLink = (href: string, label: string, exact?: boolean) => {
    const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          'block rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active
            ? 'bg-white/10 text-lms-sidebar-foreground'
            : 'text-lms-sidebar-foreground/80 hover:bg-white/5 hover:text-lms-sidebar-foreground',
        )}
        onClick={() => setOpen(false)}
      >
        {label}
      </Link>
    );
  };

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await logoutLmsSession();
    window.location.href = '/api/auth/logout';
  }

  return (
    <div className="flex min-h-screen bg-lms-surface text-foreground">
      <LmsSessionLifecycle />
      <a
        href="#conteudo-lms"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        Ir para o conteúdo
      </a>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id="lms-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-lms-sidebar text-lms-sidebar-foreground transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Navegação LMS"
      >
        <div className="border-b border-white/10 px-4 py-5">
          <Link href="/lms" className="font-heading text-lg font-bold tracking-tight">
            Omnia LMS
          </Link>
          <p className="mt-1 text-xs text-white/60">Experiência do aluno</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => navLink(item.href, item.label, item.exact))}
        </nav>
        <div className="border-t border-white/10 p-3 text-xs text-white/50">
          Busca e notificações em breve
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="lg:hidden"
              aria-expanded={open}
              aria-controls="lms-sidebar"
              onClick={() => setOpen((v) => !v)}
            >
              Menu
            </Button>
            <span className="hidden font-heading text-sm font-semibold sm:inline">
              Área de estudos
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium leading-tight">{userName}</p>
              <Link
                href="/minha-conta"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Conta
              </Link>
            </div>
            <Avatar name={userName} size="sm" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loggingOut}
              onClick={() => void handleLogout()}
            >
              Sair
            </Button>
          </div>
        </header>

        <main id="conteudo-lms" tabIndex={-1} className="flex-1 outline-none">
          <div className="mx-auto max-w-6xl animate-lms-fade-in px-4 py-6 sm:px-6">
            <OfflineBanner />
            {children}
          </div>
        </main>

        <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
          Omnia LMS — conteúdo acadêmico via Connector (sem interface Moodle)
        </footer>
      </div>
    </div>
  );
}
