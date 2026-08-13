import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function ProfessorCursosPage() {
  const user = await requirePortalSession('/professor/cursos');
  const res = await fetchAcademic<{ items?: Array<{ id: number; title: string; slug: string }> }>(
    'teaching/courses',
    { user },
  );
  const items = res.ok ? (res.data.items ?? []) : [];
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Meus cursos</h1>
      <ul className="space-y-2 text-sm">
        {items.map((c) => (
          <li key={c.id} className="rounded-md border border-border px-3 py-2">
            {c.title} <span className="text-muted-foreground">/{c.slug}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
