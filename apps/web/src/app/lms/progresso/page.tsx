import Link from 'next/link';
import { Alert, Breadcrumb, EmptyState, Progress } from '@omnia/ui';

import { requirePortalSession } from '@/lib/auth/require-session';
import { fetchLmsConnector } from '@/lib/lms/connector';
import { computeProgressPercent } from '@/lib/lms/continue';

export const dynamic = 'force-dynamic';

export default async function LmsProgressPage() {
  const user = await requirePortalSession('/lms/progresso');
  const coursesRes = await fetchLmsConnector<{
    items?: Array<{
      moodleCourseId: number;
      course: { displayName?: string; fullName?: string } | null;
    }>;
  }>('courses', { search: 'page=1&pageSize=50', user });

  if (!coursesRes.ok) {
    return (
      <Alert variant="destructive" title="Erro ao carregar progresso">
        Connector indisponível.
      </Alert>
    );
  }

  const items = coursesRes.data?.items || [];
  const rows = await Promise.all(
    items.map(async (item) => {
      const p = await fetchLmsConnector<{
        progress?: { activities: Array<{ state: number }> };
      }>(`courses/${item.moodleCourseId}/progress`, { user });
      const pct =
        p.ok && p.data?.progress?.activities
          ? computeProgressPercent(p.data.progress.activities)
          : 0;
      return {
        id: item.moodleCourseId,
        title: item.course?.displayName || item.course?.fullName || `Curso ${item.moodleCourseId}`,
        pct,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'LMS', href: '/lms' },
          { label: 'Progresso' },
        ]}
        linkComponent={Link}
      />
      <h1 className="font-heading text-3xl font-bold">Progresso</h1>
      {rows.length === 0 ? (
        <EmptyState title="Sem progresso" description="Matricule-se em cursos para acompanhar." />
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-border bg-card p-4 shadow-lms-card">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Link
                  href={`/lms/cursos/${row.id}`}
                  className="font-heading font-semibold hover:underline"
                >
                  {row.title}
                </Link>
                <span className="text-sm text-muted-foreground">{row.pct}%</span>
              </div>
              <Progress value={row.pct} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
