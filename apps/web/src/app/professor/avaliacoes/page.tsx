import { CreateAssessmentForm } from '@/components/academic/TeacherForms';
import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function ProfessorAvaliacoesPage() {
  const user = await requirePortalSession('/professor/avaliacoes');
  const courses = await fetchAcademic<{ items?: Array<{ id: number; title: string }> }>(
    'teaching/courses',
    { user },
  );
  const banks = await fetchAcademic<{
    questions?: Array<{ id: number; prompt: unknown; courseId?: number | null }>;
  }>('teaching/questions', { user });
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Avaliações</h1>
      <CreateAssessmentForm
        courses={courses.ok ? (courses.data.items ?? []) : []}
        questions={banks.ok ? (banks.data.questions ?? []) : []}
      />
    </div>
  );
}
