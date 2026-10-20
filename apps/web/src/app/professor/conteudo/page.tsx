import { CreateLessonForm } from '@/components/academic/TeacherForms';
import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function ProfessorConteudoPage() {
  const user = await requirePortalSession('/professor/conteudo');
  const courses = await fetchAcademic<{
    items?: Array<{
      id: number;
      title: string;
      modules?: Array<{ id: number; title: string }>;
    }>;
  }>('teaching/courses', { user });
  const items = courses.ok ? (courses.data.items ?? []) : [];
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Autoria de conteúdo</h1>
      <p className="text-sm text-muted-foreground">
        Crie aulas em rascunho. Publicação de curso permanece no workflow Admin (ACL).
      </p>
      <CreateLessonForm courses={items} />
    </div>
  );
}
