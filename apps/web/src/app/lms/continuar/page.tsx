import { redirect } from 'next/navigation';
import { Alert, EmptyState } from '@omnia/ui';

import { ContinueClient } from '@/components/lms/ContinueClient';
import { requirePortalSession } from '@/lib/auth/require-session';
import { fetchLmsConnector } from '@/lib/lms/connector';

export const dynamic = 'force-dynamic';

type ContinuePageProps = {
  searchParams: Promise<{ courseId?: string }>;
};

type CoursesResponse = {
  items?: Array<{ moodleCourseId: number }>;
};

export default async function LmsContinuePage({ searchParams }: ContinuePageProps) {
  const user = await requirePortalSession('/lms/continuar');
  const sp = await searchParams;
  const forcedCourse = sp.courseId ? Number.parseInt(sp.courseId, 10) : null;

  const coursesRes = await fetchLmsConnector<CoursesResponse>('courses', {
    search: 'page=1&pageSize=50',
    user,
  });

  if (!coursesRes.ok) {
    return (
      <Alert variant="destructive" title="Não foi possível continuar">
        Falha ao consultar cursos no Connector.
      </Alert>
    );
  }

  const items = coursesRes.data?.items || [];
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nenhum curso para continuar"
        description="Quando você tiver matrículas, o Continuar abrirá a última aula."
      />
    );
  }

  if (forcedCourse && items.some((i) => i.moodleCourseId === forcedCourse)) {
    redirect(`/lms/cursos/${forcedCourse}`);
  }

  return (
    <ContinueClient
      omniaUserId={user.id}
      courses={items.map((i) => ({ moodleCourseId: i.moodleCourseId }))}
    />
  );
}
