import Link from 'next/link';

import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function AlunoAvaliacoesPage() {
  const user = await requirePortalSession('/aluno/avaliacoes');
  const res = await fetchAcademic<{
    items?: Array<{ id: number; title: string; dueAt?: string | null }>;
  }>('assessments', { user });
  const items = res.ok ? (res.data.items ?? []) : [];
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Avaliações</h1>
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id}>
            <Link className="underline" href={`/aluno/avaliacoes/${a.id}`}>
              {a.title}
            </Link>
            {a.dueAt ? (
              <span className="ml-2 text-xs text-muted-foreground">até {a.dueAt}</span>
            ) : null}
          </li>
        ))}
      </ul>
      {!items.length ? (
        <p className="text-sm text-muted-foreground">Nenhuma avaliação publicada.</p>
      ) : null}
    </div>
  );
}
