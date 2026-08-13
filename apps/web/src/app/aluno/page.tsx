import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Progress } from '@omnia/ui';

import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

type Dash = {
  ok?: boolean;
  dashboard?: {
    enrollments?: Array<{
      progressPercent: number;
      course?: { title?: string | null; slug?: string | null };
    }>;
    pendingAssessments?: Array<{ id: number; title: string }>;
    certificates?: unknown[];
    continueHref?: string | null;
    notifications?: Array<{ id: number; title: string }>;
  };
};

export default async function AlunoDashboardPage() {
  const user = await requirePortalSession('/aluno');
  const gate = await fetchAcademic<{
    context?: { academicAllowed?: boolean };
  }>('ils/context', { user });
  if (gate.ok && gate.data.context?.academicAllowed === false) {
    redirect('/aluno/onboarding');
  }
  const res = await fetchAcademic<Dash>('dashboard', { user });
  const dash = res.ok ? res.data.dashboard : null;
  const enrollments = dash?.enrollments ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Olá, {user.name || 'aluno'}</h1>
        <p className="text-sm text-muted-foreground">Continue seus estudos no LMS Omnia.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {dash?.continueHref ? (
          <Button asChild>
            <Link href={dash.continueHref}>Continuar estudando</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href="/ia">Abrir Tutor IA</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/cursos">Catálogo</Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {enrollments.map((e, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-base">{e.course?.title || 'Curso'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={e.progressPercent} />
              <p className="mt-2 text-sm text-muted-foreground">{e.progressPercent}% concluído</p>
              {e.course?.slug ? (
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href={`/aluno/cursos/${e.course.slug}`}>Abrir</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
      {!enrollments.length ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma matrícula ativa ainda. Peça ao professor/admin para matricular você, ou explore o{' '}
          <Link href="/cursos" className="underline">
            catálogo
          </Link>
          .
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Avaliações pendentes</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {dash?.pendingAssessments?.length ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Certificados</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {dash?.certificates?.length ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notificações</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {dash?.notifications?.length ?? 0}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
