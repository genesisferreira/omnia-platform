import { CreateCourseForm, CreateLiveClassForm } from '@/components/academic/TeacherForms';
import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function ProfessorAulasAoVivoPage() {
  const user = await requirePortalSession('/professor/aulas-ao-vivo');
  const courses = await fetchAcademic<{ items?: Array<{ id: number; title: string }> }>(
    'teaching/courses',
    { user },
  );
  const live = await fetchAcademic<{
    items?: Array<{
      id: number;
      title: string;
      startsAt: string;
      meetingUrl?: string | null;
      platform?: string | null;
      canJoin?: boolean;
    }>;
  }>('teaching/live-classes', { user });
  const items = live.ok ? (live.data.items ?? []) : [];
  const courseItems = courses.ok ? (courses.data.items ?? []) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Aulas ao vivo</h1>
        <p className="text-sm text-muted-foreground">
          Agende encontros com link externo autorizado (Meet, Zoom, Teams). Sem SDK embutido.
        </p>
      </div>
      {!items.length ? (
        <p className="text-sm text-muted-foreground">Nenhuma aula ao vivo agendada ainda.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((ev) => (
            <li key={ev.id} className="rounded-md border border-border px-3 py-2">
              <p className="font-medium">{ev.title}</p>
              <p className="text-muted-foreground">
                {ev.startsAt}
                {ev.platform ? ` · ${ev.platform}` : ''}
              </p>
              {ev.canJoin && ev.meetingUrl ? (
                <a className="underline" href={ev.meetingUrl} target="_blank" rel="noreferrer">
                  Entrar na aula
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">Fora da janela de entrada</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <CreateLiveClassForm courses={courseItems} />
      <CreateCourseForm />
    </div>
  );
}
