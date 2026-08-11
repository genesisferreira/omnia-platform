import type { Metadata } from 'next';
import Link from 'next/link';

import { Container, SectionTitle } from '@omnia/ui';

import { fetchPublicCourses } from '@/lib/cms-lms-core';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteContext();
  return buildPageMetadata({
    pathname: '/cursos',
    title: 'Cursos | Omnia',
    description: 'Catálogo de cursos do LMS Core Omnia.',
    hostname: site.hostname,
  });
}

export default async function CursosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const list = await fetchPublicCourses({ page, q: q || undefined });

  return (
    <main className="py-10">
      <Container>
        <SectionTitle
          title="Cursos"
          subtitle="Catálogo do LMS Core — cursos publicados no Portal."
        />
        <form className="mb-8 flex gap-2" action="/cursos" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar cursos…"
            className="w-full max-w-md rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-foreground px-4 py-2 text-sm text-background"
          >
            Buscar
          </button>
        </form>

        {list.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum curso publicado no momento.</p>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">
            {list.items.map((course) => (
              <li key={course.id} className="rounded-lg border border-border p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {course.category ?? 'Curso'} · {course.level ?? '—'}
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  <Link href={`/cursos/${course.slug}`} className="hover:underline">
                    {course.title}
                  </Link>
                </h2>
                {course.shortDescription ? (
                  <p className="mt-2 text-sm text-muted-foreground">{course.shortDescription}</p>
                ) : null}
                <p className="mt-4 text-sm">
                  <Link href={`/cursos/${course.slug}`} className="font-medium underline">
                    Ver curso
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
