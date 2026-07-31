import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Progress,
  Tabs,
} from '@omnia/ui';

import { TrackLastSeen } from '@/components/lms/TrackLastSeen';
import { SyncLearningState } from '@/components/lms/SyncLearningState';
import { requirePortalSession } from '@/lib/auth/require-session';
import { fetchLmsConnector } from '@/lib/lms/connector';
import { computeProgressPercent } from '@/lib/lms/continue';
import { sanitizeLmsHtml } from '@/lib/lms/sanitize';

export const dynamic = 'force-dynamic';

type CoursePageProps = { params: Promise<{ courseId: string }> };

export default async function LmsCoursePage({ params }: CoursePageProps) {
  const { courseId: raw } = await params;
  const courseId = Number.parseInt(raw, 10);
  if (!Number.isFinite(courseId) || courseId < 1) notFound();

  const user = await requirePortalSession(`/lms/cursos/${courseId}`);

  const [courseRes, contentRes, progressRes, gradesRes, completionRes] = await Promise.all([
    fetchLmsConnector<{ course?: { displayName?: string; fullName?: string; summary?: string | null } }>(
      `courses/${courseId}`,
      { user },
    ),
    fetchLmsConnector<{
      sections?: Array<{
        sectionId: number;
        name: string;
        summary?: string | null;
        activities: Array<{
          moodleActivityId: number;
          name: string;
          modName: string;
          visible: boolean;
        }>;
      }>;
    }>(`courses/${courseId}/content`, { user }),
    fetchLmsConnector<{
      progress?: { activities: Array<{ moodleActivityId: number; state: number }> };
    }>(`courses/${courseId}/progress`, { user }),
    fetchLmsConnector<{
      grades?: Array<{ itemName: string; gradeFormatted: string | null; percentage: number | null }>;
    }>(`grades`, { user, search: `courseId=${courseId}` }),
    fetchLmsConnector<{
      completion?: { completed: boolean; timeCompleted: string | null };
    }>(`completion`, { user, search: `courseId=${courseId}` }),
  ]);

  if (!courseRes.ok) {
    if (courseRes.status === 403 || courseRes.status === 404) {
      return (
        <EmptyState
          title="Curso indisponível"
          description="Você não está matriculado ou o curso não foi encontrado."
          action={
            <Button asChild variant="outline">
              <Link href="/lms/cursos">Voltar aos cursos</Link>
            </Button>
          }
        />
      );
    }
    return (
      <Alert variant="destructive" title="Erro ao abrir curso">
        Falha no Connector.
      </Alert>
    );
  }

  const course = courseRes.data?.course;
  const title = course?.displayName || course?.fullName || `Curso ${courseId}`;
  const sections = contentRes.ok ? contentRes.data?.sections || [] : [];
  const activitiesProgress = progressRes.ok ? progressRes.data?.progress?.activities || [] : [];
  const pct = computeProgressPercent(activitiesProgress);
  const stateById = new Map(activitiesProgress.map((a) => [a.moodleActivityId, a.state]));
  const grades = gradesRes.ok ? gradesRes.data?.grades || [] : [];
  const completion = completionRes.ok ? completionRes.data?.completion : null;

  const tree = (
    <div className="space-y-4">
      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum módulo disponível.</p>
      ) : (
        sections.map((section) => (
          <Card
            key={section.sectionId}
            id={`modulo-${section.sectionId}`}
            className="scroll-mt-20 shadow-lms-card"
          >
            <CardHeader>
              <CardTitle className="text-base">{section.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {section.activities
                  .filter((a) => a.visible)
                  .map((activity) => {
                    const st = stateById.get(activity.moodleActivityId) ?? 0;
                    const done = st === 1 || st === 2;
                    return (
                      <li key={activity.moodleActivityId}>
                        <Link
                          href={`/lms/cursos/${courseId}/atividades/${activity.moodleActivityId}`}
                          className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span>
                            <span className="font-medium">{activity.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {activity.modName}
                            </span>
                          </span>
                          <Badge variant={done ? 'default' : 'muted'}>
                            {done ? 'Concluída' : 'Pendente'}
                          </Badge>
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const gradesPanel = (
    <div className="space-y-2">
      {grades.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma nota disponível.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {grades.map((g, i) => (
            <li key={`${g.itemName}-${i}`} className="flex justify-between gap-2 px-4 py-3 text-sm">
              <span>{g.itemName}</span>
              <span className="font-medium">
                {g.gradeFormatted ||
                  (g.percentage != null ? `${Math.round(g.percentage)}%` : '—')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const completionPanel = (
    <div className="space-y-2 text-sm">
      <p>
        Status:{' '}
        <Badge variant={completion?.completed ? 'default' : 'secondary'}>
          {completion?.completed ? 'Concluído' : 'Em andamento'}
        </Badge>
      </p>
      {completion?.timeCompleted ? (
        <p className="text-muted-foreground">
          Concluído em {new Date(completion.timeCompleted).toLocaleString('pt-BR')}
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <TrackLastSeen omniaUserId={user.id} courseId={courseId} />
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
          { label: title },
        ]}
        linkComponent={Link}
      />
      <header className="space-y-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{title}</h1>
        {course?.summary ? (
          <div
            className="prose prose-sm max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{
              __html: sanitizeLmsHtml(course.summary),
            }}
          />
        ) : null}
        <Progress value={pct} label="Progresso do curso" className="max-w-md" />
        <Button asChild size="sm">
          <Link href={`/lms/continuar?courseId=${courseId}`}>Continuar neste curso</Link>
        </Button>
      </header>

      <Tabs
        defaultTab="modulos"
        items={[
          { id: 'modulos', label: 'Módulos e aulas', panel: tree },
          { id: 'notas', label: 'Notas', panel: gradesPanel },
          { id: 'conclusao', label: 'Conclusão', panel: completionPanel },
        ]}
      />
    </div>
  );
}
