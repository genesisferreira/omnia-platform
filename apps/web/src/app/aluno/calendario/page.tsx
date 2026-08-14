import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function AlunoCalendarioPage() {
  const user = await requirePortalSession('/aluno/calendario');
  const res = await fetchAcademic<{
    items?: Array<{
      id: number;
      title: string;
      type: string;
      startsAt: string;
      meetingUrl?: string | null;
      canJoin?: boolean;
      platform?: string | null;
      instructions?: string | null;
    }>;
  }>('calendar', { user });
  const items = res.ok ? (res.data.items ?? []) : [];
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Calendário</h1>
      {!items.length ? (
        <p className="text-sm text-muted-foreground">Sem eventos no momento.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((e) => (
            <li key={e.id} className="rounded-md border border-border px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-muted-foreground">
                    {e.startsAt}
                    {e.type === 'class_session' ? ' · aula ao vivo' : ` · ${e.type}`}
                    {e.platform ? ` · ${e.platform}` : ''}
                  </p>
                  {e.instructions ? (
                    <p className="mt-1 text-xs text-muted-foreground">{e.instructions}</p>
                  ) : null}
                </div>
                {e.type === 'class_session' && e.canJoin && e.meetingUrl ? (
                  <a
                    className="inline-flex min-h-11 items-center rounded-md bg-foreground px-4 text-background"
                    href={e.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Entrar na aula
                  </a>
                ) : e.type === 'class_session' ? (
                  <span className="text-xs text-muted-foreground">Disponível na janela da aula</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
