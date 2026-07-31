import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Alert, Breadcrumb, Button, EmptyState } from '@omnia/ui';

import { LessonWorkspace } from '@/components/lms/LessonWorkspace';
import { SyncLearningState } from '@/components/lms/SyncLearningState';
import { requirePortalSession } from '@/lib/auth/require-session';
import { fetchLmsConnector } from '@/lib/lms/connector';
import { computeProgressPercent } from '@/lib/lms/continue';
import {
  findLessonNeighbors,
  flattenVisibleLessons,
  type LessonSection,
} from '@/lib/lms/lesson-nav';

export const dynamic = 'force-dynamic';

type ActivityPageProps = {
  params: Promise<{ courseId: string; activityId: string }>;
};

export default async function LmsActivityPage({ params }: ActivityPageProps) {
  const { courseId: cRaw, activityId: aRaw } = await params;
  const courseId = Number.parseInt(cRaw, 10);
  const activityId = Number.parseInt(aRaw, 10);
  if (!Number.isFinite(courseId) || !Number.isFinite(activityId)) notFound();

  const user = await requirePortalSession(`/lms/cursos/${courseId}/atividades/${activityId}`);

  const [courseRes, contentRes, progressRes, completionRes] = await Promise.all([
    fetchLmsConnector<{ course?: { displayName?: string; fullName?: string } }>(
      `courses/${courseId}`,
      { user },
    ),
    fetchLmsConnector<{
      sections?: Array<{
        sectionId: number;
        name: string;
        summary?: string | null;
        visible?: boolean;
        activities: Array<{
          moodleActivityId: number;
          name: string;
          modName: string;
          visible: boolean;
          url?: string | null;
          completionEnabled?: boolean;
        }>;
      }>;
    }>(`courses/${courseId}/content`, { user }),
    fetchLmsConnector<{
      progress?: { activities: Array<{ moodleActivityId: number; state: number }> };
    }>(`courses/${courseId}/progress`, { user }),
    fetchLmsConnector<{
      completion?: { completed: boolean; timeCompleted: string | null };
    }>(`completion`, { user, search: `courseId=${courseId}` }),
  ]);

  if (!courseRes.ok) {
    if (courseRes.status === 403) {
      return (
        <EmptyState
          title="Sem permissão"
          description="Você não tem acesso a este curso ou aula."
          action={
            <Button asChild variant="outline">
              <Link href="/lms/cursos">Voltar aos cursos</Link>
            </Button>
          }
        />
      );
    }
    if (courseRes.status === 404) {
      return (
        <EmptyState
          title="Curso não encontrado"
          description="Este curso não está disponível."
          action={
            <Button asChild variant="outline">
              <Link href="/lms/cursos">Voltar aos cursos</Link>
            </Button>
          }
        />
      );
    }
    return (
      <Alert variant="destructive" title="Erro ao abrir a aula">
        Falha no Connector. Tente novamente em instantes.
      </Alert>
    );
  }

  if (!contentRes.ok) {
    return (
      <Alert variant="destructive" title="Não foi possível carregar o conteúdo">
        Verifique matrícula e tente novamente.
      </Alert>
    );
  }

  const sections = (contentRes.data?.sections || []) as LessonSection[];
  let sectionId: number | null = null;
  let sectionName = '';
  let sectionSummary: string | null = null;
  let activity:
    | {
        moodleActivityId: number;
        name: string;
        modName: string;
        visible: boolean;
        url?: string | null;
        completionEnabled?: boolean;
      }
    | undefined;

  for (const section of sections) {
    const found = section.activities.find((a) => a.moodleActivityId === activityId);
    if (found) {
      activity = found;
      sectionId = section.sectionId;
      sectionName = section.name;
      sectionSummary = section.summary ?? null;
      break;
    }
  }

  if (!activity) {
    return (
      <EmptyState
        title="Atividade não encontrada"
        description="Esta aula não está na estrutura do curso."
        action={
          <Button asChild variant="outline">
            <Link href={`/lms/cursos/${courseId}`}>Voltar ao curso</Link>
          </Button>
        }
      />
    );
  }

  if (!activity.visible) {
    return (
      <EmptyState
        title="Aula bloqueada"
        description="Esta atividade não está visível para o seu perfil no momento."
        action={
          <Button asChild variant="outline">
            <Link href={`/lms/cursos/${courseId}`}>Voltar ao curso</Link>
          </Button>
        }
      />
    );
  }

  const courseTitle =
    courseRes.data?.course?.displayName ||
    courseRes.data?.course?.fullName ||
    `Curso ${courseId}`;

  const activitiesProgress = progressRes.ok
    ? progressRes.data?.progress?.activities || []
    : [];
  const stateById: Record<number, number> = {};
  for (const a of activitiesProgress) {
    stateById[a.moodleActivityId] = a.state;
  }
  const moodleState = stateById[activityId] ?? 0;
  const courseProgressPercent = computeProgressPercent(activitiesProgress);
  const completion = completionRes.ok ? completionRes.data?.completion : null;

  const flat = flattenVisibleLessons(courseId, sections);
  const { prev, next } = findLessonNeighbors(flat, activityId);

  return (
    <div className="space-y-4">
      <SyncLearningState
        courseId={courseId}
        activities={activitiesProgress.map((a) => ({
          moodleActivityId: a.moodleActivityId,
          state: a.state,
        }))}
        completion={completion}
      />

      <Breadcrumb
        items={[
          { label: 'LMS', href: '/lms' },
          { label: 'Cursos', href: '/lms/cursos' },
          { label: courseTitle, href: `/lms/cursos/${courseId}` },
          { label: sectionName, href: `/lms/cursos/${courseId}#modulo-${sectionId}` },
          { label: activity.name },
        ]}
        linkComponent={Link}
      />

      <LessonWorkspace
        omniaUserId={user.id}
        courseId={courseId}
        courseTitle={courseTitle}
        activity={activity}
        sectionId={sectionId!}
        sectionName={sectionName}
        sectionSummary={sectionSummary}
        sections={sections}
        stateById={stateById}
        courseProgressPercent={courseProgressPercent}
        prev={prev}
        next={next}
        moodleState={moodleState}
      />
    </div>
  );
}
