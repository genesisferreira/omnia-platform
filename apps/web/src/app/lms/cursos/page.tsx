import Link from 'next/link';
import { Alert, Breadcrumb, EmptyState } from '@omnia/ui';

import { CourseCard } from '@/components/lms/CourseCard';
import { requirePortalSession } from '@/lib/auth/require-session';
import { fetchLmsConnector } from '@/lib/lms/connector';
import { computeProgressPercent } from '@/lib/lms/continue';

export const dynamic = 'force-dynamic';

type CoursesResponse = {
  connected?: boolean;
  reason?: string;
  items?: Array<{
    moodleCourseId: number;
    course: {
      displayName?: string;
      fullName?: string;
      summary?: string | null;
    } | null;
  }>;
};

type ProgressResponse = {
  progress?: { activities: Array<{ state: number }> };
};

export default async function LmsCoursesPage() {
  const user = await requirePortalSession('/lms/cursos');
  const me = await fetchLmsConnector<{ connected?: boolean }>('me', { user });
  if (me.ok && me.data && (me.data as { connected?: boolean }).connected === false) {
    return (
      <EmptyState
        title="Conta não vinculada"
        description="Vincule sua identidade Moodle para ver matrículas."
      />
    );
  }

  const coursesRes = await fetchLmsConnector<CoursesResponse>('courses', {
    search: 'page=1&pageSize=50',
    user,
  });

  if (!coursesRes.ok) {
    return (
      <Alert variant="destructive" title="Erro ao carregar cursos">
        Falha no Connector. Tente novamente.
      </Alert>
    );
  }

  const items = coursesRes.data?.items || [];
  const progressMap: Record<number, number> = {};
  await Promise.all(
    items.map(async (item) => {
      const p = await fetchLmsConnector<ProgressResponse>(
        `courses/${item.moodleCourseId}/progress`,
        { user },
      );
      if (p.ok && p.data?.progress?.activities) {
        progressMap[item.moodleCourseId] = computeProgressPercent(p.data.progress.activities);
      }
    }),
  );

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[{ label: 'LMS', href: '/lms' }, { label: 'Meus cursos' }]}
        linkComponent={Link}
      />
      <h1 className="font-heading text-3xl font-bold">Meus cursos</h1>
      {items.length === 0 ? (
        <EmptyState
          title="Sem cursos"
          description="Nenhuma matrícula encontrada no motor acadêmico."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const pct = progressMap[item.moodleCourseId] || 0;
            return (
              <CourseCard
                key={item.moodleCourseId}
                courseId={item.moodleCourseId}
                title={
                  item.course?.displayName ||
                  item.course?.fullName ||
                  `Curso ${item.moodleCourseId}`
                }
                summary={item.course?.summary}
                progressPercent={pct}
                status={pct >= 100 ? 'concluido' : pct > 0 ? 'em_andamento' : 'nao_iniciado'}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
