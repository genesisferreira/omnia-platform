import { EnrollForm, GradeForm } from '@/components/academic/TeacherForms';
import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function ProfessorNotasPage() {
  const user = await requirePortalSession('/professor/notas');
  const attempts = await fetchAcademic<{
    items?: Array<{
      id: number;
      studentId?: number | null;
      status?: string;
      score?: number | null;
      needsManualGrade?: boolean;
    }>;
  }>('teaching/attempts', { user });
  const courses = await fetchAcademic<{ items?: Array<{ id: number; title: string }> }>(
    'teaching/courses',
    { user },
  );
  const items = attempts.ok ? (attempts.data.items ?? []) : [];
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Correção e matrículas</h1>
      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id} className="rounded-md border border-border p-3 text-sm">
            Tentativa #{a.id} · aluno {a.studentId} · {a.status} · {a.score ?? '—'}
            <GradeForm attemptId={a.id} />
          </li>
        ))}
      </ul>
      {!items.length ? (
        <p className="text-sm text-muted-foreground">Nenhuma tentativa pendente.</p>
      ) : null}
      <EnrollForm courses={courses.ok ? (courses.data.items ?? []) : []} />
    </div>
  );
}
