import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Alert, Badge, Breadcrumb, Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@omnia/ui';

import { TrackLastSeen } from '@/components/lms/TrackLastSeen';
import { requirePortalSession } from '@/lib/auth/require-session';
import { fetchLmsConnector } from '@/lib/lms/connector';

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

  const [courseRes, contentRes, progressRes] = await Promise.all([
    fetchLmsConnector<{ course?: { displayName?: string; fullName?: string } }>(
      `courses/${courseId}`,
      { user },
    ),
    fetchLmsConnector<{
      sections?: Array<{
        sectionId: number;
        name: string;
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
  ]);

  if (!courseRes.ok || !contentRes.ok) {
    return (
      <Alert variant="destructive" title="Não foi possível abrir a aula">
        Verifique matrícula e tente novamente.
      </Alert>
    );
  }

  let sectionId: number | null = null;
  let activity:
    | { moodleActivityId: number; name: string; modName: string; visible: boolean }
    | undefined;
  for (const section of contentRes.data?.sections || []) {
    const found = section.activities.find((a) => a.moodleActivityId === activityId);
    if (found) {
      activity = found;
      sectionId = section.sectionId;
      break;
    }
  }

  if (!activity || !activity.visible) {
    return (
      <EmptyState
        title="Atividade não encontrada"
        description="Esta aula não está disponível na estrutura do curso."
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
  const st =
    progressRes.ok
      ? progressRes.data?.progress?.activities.find((a) => a.moodleActivityId === activityId)
          ?.state
      : 0;
  const done = st === 1 || st === 2;

  return (
    <div className="space-y-6">
      <TrackLastSeen
        omniaUserId={user.id}
        courseId={courseId}
        activityId={activityId}
        sectionId={sectionId}
      />
      <Breadcrumb
        items={[
          { label: 'LMS', href: '/lms' },
          { label: 'Cursos', href: '/lms/cursos' },
          { label: courseTitle, href: `/lms/cursos/${courseId}` },
          { label: activity.name },
        ]}
        linkComponent={Link}
      />

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-3xl font-bold">{activity.name}</h1>
          <Badge variant={done ? 'default' : 'secondary'}>
            {done ? 'Concluída' : 'Em estudo'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">Tipo: {activity.modName}</p>
      </header>

      <Card className="shadow-lms-card">
        <CardHeader>
          <CardTitle className="text-base">Conteúdo da aula</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Esta é a experiência Omnia da atividade. O player de mídia protegido e streaming ficam
            fora do escopo desta sprint — não há iframe nem redirect para a interface do Moodle.
          </p>
          <p>
            Metadados e progresso vêm exclusivamente do Connector (`content` + `progress`).
          </p>
          <Button asChild variant="outline">
            <Link href={`/lms/cursos/${courseId}`}>Voltar aos módulos</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
