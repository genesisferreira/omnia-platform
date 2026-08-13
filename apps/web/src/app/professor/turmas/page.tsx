import { CreateClassForm } from '@/components/academic/TeacherForms';
import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function ProfessorTurmasPage() {
  const user = await requirePortalSession('/professor/turmas');
  const dash = await fetchAcademic<{
    dashboard?: { classes?: Array<{ id: number; name: string; status?: string }> };
  }>('teaching/dashboard', { user });
  const courses = await fetchAcademic<{ items?: Array<{ id: number; title: string }> }>(
    'teaching/courses',
    { user },
  );
  const classes = dash.ok ? (dash.data.dashboard?.classes ?? []) : [];
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Turmas</h1>
      <ul className="space-y-2 text-sm">
        {classes.map((c) => (
          <li key={c.id} className="rounded-md border border-border px-3 py-2">
            {c.name} · {c.status}
          </li>
        ))}
      </ul>
      <CreateClassForm courses={courses.ok ? (courses.data.items ?? []) : []} />
    </div>
  );
}
