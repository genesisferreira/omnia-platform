import Link from 'next/link';

import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  cn,
} from '@omnia/ui';

import { PARTNER_STATUS_LABELS } from '@/lib/marketplace/labels';
import type { PartnerContext, PartnerSummary } from '@/lib/marketplace/types';

export function PageHeader(props: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-omnia-deep-blue">
          {props.title}
        </h1>
        {props.description ? (
          <div className="max-w-2xl text-sm text-omnia-graphite-light">{props.description}</div>
        ) : null}
      </div>
      {props.action}
    </header>
  );
}

export function NoPartnerNotice({ ctx }: { ctx: PartnerContext }) {
  return (
    <EmptyState
      title="Nenhuma empresa vinculada"
      description={
        ctx.isStaff
          ? 'Sua conta é da equipe Omnia e não está associada a um parceiro. Gerencie parceiros pelo painel administrativo.'
          : 'Sua conta ainda não está associada a uma empresa parceira ativa. Se você já se cadastrou, aguarde a aprovação da equipe Omnia ou fale conosco.'
      }
      action={
        <Button asChild variant="outline">
          <Link href="/contato">Falar com a equipe</Link>
        </Button>
      }
    />
  );
}

export function PartnerStatusAlert({ partner }: { partner: PartnerSummary }) {
  if (partner.status === 'approved' && partner.active) return null;
  const label = PARTNER_STATUS_LABELS[partner.status ?? ''] ?? partner.status ?? '—';
  return (
    <Alert variant="warning" title="Cadastro ainda não publicado" className="mb-6">
      Situação do cadastro: {label}
      {partner.status === 'approved' && !partner.active ? ' (inativo)' : ''}. Seus anúncios só
      aparecem no marketplace público quando o parceiro estiver aprovado, ativo e publicado pela
      equipe Omnia.
    </Alert>
  );
}

export function StatCard(props: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <Card className="h-full border-omnia-deep-blue/10 transition-colors hover:border-omnia-deep-blue/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-omnia-graphite-light">
          {props.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-omnia-deep-blue">{props.value}</p>
        {props.hint ? <p className="mt-1 text-xs text-omnia-graphite-light">{props.hint}</p> : null}
      </CardContent>
    </Card>
  );
  return props.href ? (
    <Link
      href={props.href}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald"
    >
      {body}
    </Link>
  ) : (
    body
  );
}

const TONES: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-900',
  accepted: 'bg-emerald-100 text-emerald-900',
  sent: 'bg-sky-100 text-sky-900',
  proposal_sent: 'bg-sky-100 text-sky-900',
  in_review: 'bg-amber-100 text-amber-900',
  pending: 'bg-amber-100 text-amber-900',
  negotiating: 'bg-amber-100 text-amber-900',
  submitted: 'bg-slate-100 text-slate-800',
  draft: 'bg-slate-100 text-slate-800',
  rejected: 'bg-red-100 text-red-900',
  declined: 'bg-red-100 text-red-900',
  suspended: 'bg-red-100 text-red-900',
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  return (
    <Badge variant="muted" className={cn('whitespace-nowrap', TONES[status])}>
      {label}
    </Badge>
  );
}

/** Alias semântico para telas de listagem. */
export function StatusBadge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <Badge variant="muted" className={cn('whitespace-nowrap', TONES[tone])}>
      {children}
    </Badge>
  );
}

export function EmptyList(props: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <EmptyState
      title={props.title}
      description={props.description}
      action={
        props.actionHref && props.actionLabel ? (
          <Button asChild variant="outline">
            <Link href={props.actionHref}>{props.actionLabel}</Link>
          </Button>
        ) : undefined
      }
    />
  );
}

export function Pagination(props: {
  basePath: string;
  page: number;
  totalPages: number;
  params?: Record<string, string | undefined>;
}) {
  if (props.totalPages <= 1) return null;
  const href = (page: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(props.params ?? {}))
      if (value) search.set(key, value);
    if (page > 1) search.set('page', String(page));
    const qs = search.toString();
    return qs ? `${props.basePath}?${qs}` : props.basePath;
  };
  return (
    <nav aria-label="Paginação" className="mt-4 flex items-center gap-4 text-sm">
      {props.page > 1 ? (
        <Link href={href(props.page - 1)} className="text-omnia-deep-blue underline">
          Anterior
        </Link>
      ) : null}
      <span>
        Página {props.page} de {props.totalPages}
      </span>
      {props.page < props.totalPages ? (
        <Link href={href(props.page + 1)} className="text-omnia-deep-blue underline">
          Próxima
        </Link>
      ) : null}
    </nav>
  );
}

export function LoadError({ message }: { message: string }) {
  return (
    <Alert variant="destructive" title="Não foi possível carregar os dados">
      {message}
    </Alert>
  );
}

export function pageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  return Math.max(1, Math.floor(Number(raw) || 1));
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  return (Array.isArray(value) ? value[0] : value) || undefined;
}
