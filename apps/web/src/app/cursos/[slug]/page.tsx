import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Container, SectionTitle } from '@omnia/ui';

import { AskAiPanel } from '@/components/ai/AskAiPanel';
import { TutorPanel } from '@/components/ai/TutorPanel';
import { fetchPublicCourse } from '@/lib/cms-lms-core';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchPublicCourse(slug);
  const site = await getSiteContext();
  return buildPageMetadata({
    pathname: `/cursos/${slug}`,
    title: data ? `${data.course.title} | Cursos` : 'Curso | Omnia',
    description: data?.course.shortDescription ?? 'Curso do LMS Core Omnia.',
    hostname: site.hostname,
  });
}

export default async function CursoDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await fetchPublicCourse(slug);
  if (!data) notFound();

  const { course, modules } = data;

  return (
    <main className="py-10">
      <Container>
        <p className="mb-4 text-sm text-muted-foreground">
          <Link href="/cursos" className="underline">
            Cursos
          </Link>
          {' / '}
          {course.title}
        </p>
        <SectionTitle
          title={course.title}
          subtitle={course.shortDescription ?? undefined}
        />
        <p className="mb-4 text-sm text-muted-foreground">
          {course.category ?? 'Curso'} · {course.level ?? '—'}
          {course.estimatedHours != null ? ` · ${course.estimatedHours}h` : ''}
        </p>

        <AskAiPanel
          context={{
            courseId: course.id,
            courseTitle: course.title,
            language: 'pt-BR',
          }}
        />

        <TutorPanel
          context={{
            courseId: course.id,
            courseTitle: course.title,
            language: 'pt-BR',
          }}
        />

        <div className="space-y-8">
          {modules.map((mod) => (
            <section key={mod.id} className="rounded-lg border border-border p-5">
              <h2 className="text-lg font-semibold">{mod.title}</h2>
              {mod.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
              ) : null}
              <ol className="mt-4 space-y-2">
                {mod.lessons.map((lesson) => (
                  <li key={lesson.id} className="flex items-baseline justify-between gap-4 text-sm">
                    <Link
                      href={`/cursos/${course.slug}/aula/${lesson.slug}`}
                      className="font-medium underline"
                    >
                      {lesson.order}. {lesson.title}
                    </Link>
                    <span className="shrink-0 text-xs uppercase text-muted-foreground">
                      {lesson.type}
                      {lesson.duration != null ? ` · ${lesson.duration} min` : ''}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </Container>
    </main>
  );
}
