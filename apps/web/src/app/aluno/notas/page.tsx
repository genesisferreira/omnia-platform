import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function AlunoNotasPage() {
  const user = await requirePortalSession('/aluno/notas');
  const res = await fetchAcademic<{
    items?: Array<{
      id: number;
      score?: number | null;
      feedback?: string | null;
      publishedAt?: string | null;
    }>;
  }>('grades', { user });
  const items = res.ok ? (res.data.items ?? []) : [];
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Notas</h1>
      <ul className="space-y-3">
        {items.map((g) => (
          <li key={g.id} className="rounded-md border border-border p-3 text-sm">
            <p className="font-medium">Nota: {g.score ?? '—'}</p>
            {g.feedback ? <p className="text-muted-foreground">{g.feedback}</p> : null}
          </li>
        ))}
      </ul>
      {!items.length ? (
        <p className="text-sm text-muted-foreground">Nenhuma nota publicada ainda.</p>
      ) : null}
    </div>
  );
}
