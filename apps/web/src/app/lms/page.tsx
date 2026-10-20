import Link from 'next/link';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Progress,
} from '@omnia/ui';

import { CourseCard } from '@/components/lms/CourseCard';
import { LearningTimeline } from '@/components/lms/LearningTimeline';
import { requirePortalSession } from '@/lib/auth/require-session';
import { fetchLmsConnector } from '@/lib/lms/connector';
import { computeProgressPercent } from '@/lib/lms/continue';

export const dynamic = 'force-dynamic';

type CoursesResponse = {
  ok?: boolean;
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

type MeResponse = {
  ok?: boolean;
  connected?: boolean;
  reason?: string;
  user?: { fullName?: string; firstName?: string | null };
};

type ProgressResponse = {
  ok?: boolean;
  progress?: {
    activities: Array<{ state: number }>;
  };
};

export default async function LmsDashboardPage() {
  const portalUser = await requirePortalSession('/lms');
  const me = await fetchLmsConnector<MeResponse>('me');
  if (!me.ok) {
    return (
      <Alert variant="destructive" title="Não foi possível carregar o LMS">
        Verifique sua sessão e tente novamente. ({me.error})
      </Alert>
    );
  }

  const meData = me.data;
  if (meData && meData.connected === false) {
    return (
      <EmptyState
        title="Conta ainda não vinculada ao LMS"
        description="Seu usuário Omnia precisa de um Identity Link com o Moodle para ver cursos. Fale com o administrador."
        action={
          <Button asChild variant="outline">
            <Link href="/minha-conta">Voltar à minha conta</Link>
          </Button>
        }
      />
    );
  }

  const coursesRes = await fetchLmsConnector<CoursesResponse>('courses', {
    search: 'page=1&pageSize=20',
    user: portalUser,
  });

  if (!coursesRes.ok) {
    return (
      <Alert variant="destructive" title="Erro ao listar cursos">
        O Connector não respondeu. Tente novamente em instantes.
      </Alert>
    );
  }

  const items = coursesRes.data?.items || [];
  const hello =
    meData?.user?.fullName || meData?.user?.firstName || portalUser.firstName || 'aluno';

  const progressMap: Record<number, number> = {};
  await Promise.all(
    items.slice(0, 8).map(async (item) => {
      const p = await fetchLmsConnector<ProgressResponse>(
        `courses/${item.moodleCourseId}/progress`,
        { user: portalUser },
      );
      if (p.ok && p.data?.progress?.activities) {
        progressMap[item.moodleCourseId] = computeProgressPercent(p.data.progress.activities);
      }
    }),
  );

  const avg =
    items.length === 0
      ? 0
      : Math.round(
          items.reduce((acc, i) => acc + (progressMap[i.moodleCourseId] || 0), 0) /
            Math.max(items.length, 1),
        );

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[{ label: 'LMS', href: '/lms' }, { label: 'Dashboard' }]}
        linkComponent={Link}
      />

      <section>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Olá, {hello}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Continue seus estudos na experiência Omnia. Todo conteúdo acadêmico chega pelo Connector —
          sem abrir a interface do Moodle.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-lms-card">
          <CardHeader>
            <CardTitle className="text-base">Continuar estudando</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/lms/continuar">Retomar</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lms-card">
          <CardHeader>
            <CardTitle className="text-base">Meus cursos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold">{items.length}</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/lms/cursos">Ver todos</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lms-card">
          <CardHeader>
            <CardTitle className="text-base">Progresso médio</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={avg} label="Geral" />
          </CardContent>
        </Card>
        <Card className="shadow-lms-card">
          <CardHeader>
            <CardTitle className="text-base">Certificados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Placeholder — Sprint futura</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-2">
          <h2 className="font-heading text-xl font-semibold">Meus cursos</h2>
          <Link href="/lms/cursos" className="text-sm text-primary hover:underline">
            Ver todos
          </Link>
        </div>
        {items.length === 0 ? (
          <EmptyState
            title="Você ainda não tem cursos"
            description="Quando houver matrículas no motor acadêmico, elas aparecerão aqui."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.slice(0, 6).map((item) => {
              const pct = progressMap[item.moodleCourseId] || 0;
              const status = pct >= 100 ? 'concluido' : pct > 0 ? 'em_andamento' : 'nao_iniciado';
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
                  status={status}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linha do tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <LearningTimeline />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horas estudadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Placeholder — métrica de negócio em evolução
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
