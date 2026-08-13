import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, Progress } from '@omnia/ui';

import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function AlunoCursosPage() {
  const user = await requirePortalSession('/aluno/cursos');
  const res = await fetchAcademic<{
    items?: Array<{
      progressPercent: number;
      course?: { title?: string | null; slug?: string | null };
    }>;
  }>('courses', { user });
  const items = res.ok ? (res.data.items ?? []) : [];
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Meus cursos</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((e, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>{e.course?.title || 'Curso'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={e.progressPercent} />
              {e.course?.slug ? (
                <Link
                  className="mt-3 inline-block text-sm underline"
                  href={`/aluno/cursos/${e.course.slug}`}
                >
                  Continuar
                </Link>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
      {!items.length ? <p className="text-sm text-muted-foreground">Sem matrículas.</p> : null}
    </div>
  );
}
