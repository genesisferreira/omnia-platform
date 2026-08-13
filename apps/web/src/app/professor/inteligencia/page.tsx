import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@omnia/ui';

import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function ProfessorInteligenciaPage() {
  const user = await requirePortalSession('/professor/inteligencia');
  const dash = await fetchAcademic<{
    dashboard?: { classes?: Array<{ id: number; name: string }> };
  }>('teaching/dashboard', { user });
  const classes = dash.ok ? (dash.data.dashboard?.classes ?? []) : [];
  const intel = await Promise.all(
    classes.map(async (cls) => {
      const res = await fetchAcademic<{
        intel?: {
          avgProgress?: number;
          studentCount?: number;
          studentsNeedingSupport?: Array<{ studentId: number; lowCompetencies: string[] }>;
        };
      }>(`ils/teaching/class-intel/${cls.id}`, { user });
      return { cls, intel: res.ok ? res.data.intel : null };
    }),
  );

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Inteligência da turma</h1>
      {intel.map(({ cls, intel: row }) => (
        <Card key={cls.id}>
          <CardHeader>
            <CardTitle>{cls.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {row?.studentCount ?? 0} alunos · progresso médio {row?.avgProgress ?? 0}%
            </p>
            <ul className="list-disc pl-5">
              {(row?.studentsNeedingSupport || []).map((s) => (
                <li key={s.studentId}>
                  <Link className="underline" href={`/professor/alunos/${s.studentId}`}>
                    Aluno #{s.studentId}
                  </Link>{' '}
                  · {s.lowCompetencies.join(', ') || 'acompanhamento'}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
      {!classes.length ? <p className="text-sm text-muted-foreground">Nenhuma turma.</p> : null}
    </div>
  );
}
