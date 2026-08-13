import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function AlunoCalendarioPage() {
  const user = await requirePortalSession('/aluno/calendario');
  const res = await fetchAcademic<{
    items?: Array<{ id: number; title: string; type: string; startsAt: string }>;
  }>('calendar', { user });
  const items = res.ok ? (res.data.items ?? []) : [];
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Calendário</h1>
      <ul className="space-y-2 text-sm">
        {items.map((e) => (
          <li key={e.id} className="rounded-md border border-border px-3 py-2">
            <span className="font-medium">{e.title}</span>
            <span className="ml-2 text-muted-foreground">{e.startsAt}</span>
          </li>
        ))}
      </ul>
      {!items.length ? (
        <p className="text-sm text-muted-foreground">Sem eventos no momento.</p>
      ) : null}
    </div>
  );
}
