import { Card, CardContent, CardHeader, CardTitle } from '@omnia/ui';

import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function ProfessorProgressoPage() {
  const user = await requirePortalSession('/professor/progresso');
  const res = await fetchAcademic<{
    dashboard?: {
      averageProgress?: number;
      struggling?: number;
      activeStudents?: number;
      classes?: Array<{ id: number; name: string; status?: string }>;
    };
  }>('teaching/dashboard', { user });
  const d = res.ok ? res.data.dashboard : null;
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Progresso</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Progresso médio</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{d?.averageProgress ?? 0}%</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Alunos ativos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{d?.activeStudents ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Com dificuldade (&lt;40%)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{d?.struggling ?? 0}</CardContent>
        </Card>
      </div>
      <ul className="space-y-2 text-sm">
        {(d?.classes ?? []).map((c) => (
          <li key={c.id} className="rounded-md border border-border px-3 py-2">
            {c.name} · {c.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
