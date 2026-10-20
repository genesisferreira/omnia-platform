import Link from 'next/link';
import { EnrollForm } from '@/components/academic/TeacherForms';
import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function ProfessorAlunosPage() {
  const user = await requirePortalSession('/professor/alunos');
  const dash = await fetchAcademic<{
    dashboard?: { classes?: Array<{ id: number; name: string }> };
  }>('teaching/dashboard', { user });
  const courses = await fetchAcademic<{ items?: Array<{ id: number; title: string }> }>(
    'teaching/courses',
    { user },
  );
  const classes = dash.ok ? (dash.data.dashboard?.classes ?? []) : [];
  const rosters = await Promise.all(
    classes.map(async (cls) => {
      const res = await fetchAcademic<{
        students?: Array<{
          studentId?: number | null;
          progressPercent?: number;
          status?: string;
          course?: { title?: string | null };
        }>;
      }>(`teaching/classes/${cls.id}`, { user });
      return {
        cls,
        students: res.ok ? (res.data.students ?? []) : [],
      };
    }),
  );

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Alunos das turmas</h1>
      {!classes.length ? (
        <p className="rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          Você ainda não possui turmas. Crie uma turma para acompanhar alunos.
        </p>
      ) : null}
      {rosters.map(({ cls, students }) => (
        <section key={cls.id} className="space-y-2">
          <h2 className="text-sm font-semibold">{cls.name}</h2>
          <ul className="space-y-1 text-sm">
            {students.map((s, i) => (
              <li
                key={`${cls.id}-${s.studentId ?? i}`}
                className="rounded-md border border-border px-3 py-2"
              >
                {s.studentId ? (
                  <Link className="underline" href={`/professor/alunos/${s.studentId}`}>
                    Aluno #{s.studentId}
                  </Link>
                ) : (
                  <>Aluno</>
                )}{' '}
                · {s.course?.title || 'curso'} · {s.status} · {s.progressPercent ?? 0}%
              </li>
            ))}
          </ul>
          {!students.length ? (
            <p className="text-sm text-muted-foreground">Nenhum aluno nesta turma.</p>
          ) : null}
        </section>
      ))}
      <EnrollForm courses={courses.ok ? (courses.data.items ?? []) : []} />
    </div>
  );
}
