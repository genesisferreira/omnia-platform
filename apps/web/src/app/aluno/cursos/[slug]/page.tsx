import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Progress } from '@omnia/ui';

import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };

export default async function AlunoCursoPage({ params }: PageProps) {
  const { slug } = await params;
  const user = await requirePortalSession(`/aluno/cursos/${slug}`);
  const res = await fetchAcademic<{
    course?: { title?: string; slug?: string };
    enrollment?: { progressPercent?: number };
    modules?: Array<{
      id: number;
      title: string;
      lessons: Array<{ id: number; title: string; slug: string; completed: boolean }>;
    }>;
    assessments?: Array<{ id: number; title: string }>;
  }>(`courses/${slug}`, { user });
  if (!res.ok) notFound();
  const course = res.data.course;
  if (!course) notFound();
  const data = res.data;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/aluno/cursos" className="underline">
            Meus cursos
          </Link>
        </p>
        <h1 className="font-heading text-2xl font-semibold">{course.title}</h1>
        <Progress className="mt-3" value={data.enrollment?.progressPercent ?? 0} />
      </div>
      {data.modules?.map((mod) => (
        <Card key={mod.id}>
          <CardHeader>
            <CardTitle className="text-base">{mod.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mod.lessons.map((l) => (
              <Link
                key={l.id}
                href={`/aluno/cursos/${slug}/aula/${l.slug}`}
                className="block rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                {l.completed ? '✓ ' : ''}
                {l.title}
              </Link>
            ))}
          </CardContent>
        </Card>
      ))}
      {data.assessments?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Avaliações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.assessments.map((a) => (
              <Link
                key={a.id}
                href={`/aluno/avaliacoes/${a.id}`}
                className="block text-sm underline"
              >
                {a.title}
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
