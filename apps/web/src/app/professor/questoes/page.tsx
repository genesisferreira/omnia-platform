import { CreateQuestionForm } from '@/components/academic/TeacherForms';
import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function ProfessorQuestoesPage() {
  const user = await requirePortalSession('/professor/questoes');
  const courses = await fetchAcademic<{ items?: Array<{ id: number; title: string }> }>(
    'teaching/courses',
    { user },
  );
  const banks = await fetchAcademic<{
    questions?: Array<{ id: number; prompt: unknown; type?: string }>;
  }>('teaching/questions', { user });
  const questions = banks.ok ? (banks.data.questions ?? []) : [];
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Banco de questões</h1>
      <ul className="space-y-2 text-sm">
        {questions.map((q) => (
          <li key={q.id} className="rounded-md border border-border px-3 py-2">
            #{q.id} · {q.type} · {String(q.prompt || '').slice(0, 100)}
          </li>
        ))}
      </ul>
      <CreateQuestionForm courses={courses.ok ? (courses.data.items ?? []) : []} />
    </div>
  );
}
