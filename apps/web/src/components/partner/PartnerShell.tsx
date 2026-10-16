'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Button, cn } from '@omnia/ui';

import { selectPartnerAction } from '@/app/parceiro/actions';

export const PARTNER_NAV = [
  { href: '/parceiro', label: 'Dashboard', exact: true },
  { href: '/parceiro/empresa', label: 'Empresa' },
  { href: '/parceiro/produtos', label: 'Produtos' },
  { href: '/parceiro/servicos', label: 'Serviços' },
  { href: '/parceiro/solicitacoes', label: 'Solicitações' },
  { href: '/parceiro/orcamentos', label: 'Orçamentos' },
  { href: '/parceiro/oportunidades', label: 'Oportunidades' },
  { href: '/parceiro/estatisticas', label: 'Estatísticas' },
  { href: '/parceiro/plano', label: 'Plano' },
] as const;

export type PartnerShellProps = {
  userName: string;
  partnerName: string | null;
  roleLabel: string | null;
  partners: Array<{ id: string; name: string }>;
  selectedPartnerId: string | null;
  children: React.ReactNode;
};

export function PartnerShell(props: PartnerShellProps) {
  const pathname = usePathname() || '/parceiro';
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-omnia-white text-omnia-graphite">
      <a
        href="#conteudo-parceiro"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-omnia-deep-blue"
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
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-omnia-deep-blue text-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="border-b border-white/10 px-4 py-4">
          <Link
            href="/parceiro"
            className="block font-heading text-lg font-semibold leading-tight"
            onClick={() => setOpen(false)}
          >
            Omnia Parceiros
          </Link>
          <p className="mt-1 truncate text-xs text-white/70">{props.userName}</p>
          {props.partnerName ? (
            <p className="mt-2 truncate text-sm font-medium text-white">{props.partnerName}</p>
          ) : null}
          {props.roleLabel ? <p className="text-xs text-white/60">{props.roleLabel}</p> : null}
          {props.partners.length > 1 ? (
            <form action={selectPartnerAction} className="mt-3 space-y-2">
              <label htmlFor="partner-select" className="block text-xs text-white/70">
                Empresa ativa
              </label>
              <select
                id="partner-select"
                name="partnerId"
                defaultValue={props.selectedPartnerId ?? undefined}
                className="min-h-10 w-full rounded-md border border-white/20 bg-white/10 px-2 py-1 text-sm text-white"
              >
                {props.partners.map((partner) => (
                  <option key={partner.id} value={partner.id} className="text-omnia-graphite">
                    {partner.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="min-h-9 w-full rounded-md bg-white/10 px-3 py-1 text-xs font-medium hover:bg-white/15"
              >
                Trocar empresa
              </button>
            </form>
          ) : null}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navegação do parceiro">
          {PARTNER_NAV.map((item) => {
            const active =
              'exact' in item && item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  'block min-h-11 rounded-md px-3 py-2.5 text-sm font-medium',
                  active ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-white/10 p-3 text-xs text-white/70">
          <Link href="/marketplace" className="block px-1 py-1 hover:underline" onClick={() => setOpen(false)}>
            Ver marketplace
          </Link>
          <Link href="/minha-conta" className="block px-1 py-1 hover:underline" onClick={() => setOpen(false)}>
            Minha conta
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="block min-h-10 w-full rounded-md bg-white/10 px-3 py-2 text-left font-medium text-white hover:bg-white/15"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-omnia-deep-blue/10 bg-white px-4 py-3 lg:hidden">
          <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => setOpen(true)}>
            Menu
          </Button>
          <span className="truncate font-heading text-sm font-semibold text-omnia-deep-blue">
            {props.partnerName ?? 'Omnia Parceiros'}
          </span>
        </header>
        <main id="conteudo-parceiro" className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-8">
          {props.children}
        </main>
      </div>
    </div>
  );
}
