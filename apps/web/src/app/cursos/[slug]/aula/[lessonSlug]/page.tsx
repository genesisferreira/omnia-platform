import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Container, SectionTitle } from '@omnia/ui';

import { AskAiPanel } from '@/components/ai/AskAiPanel';
import { TutorPanel } from '@/components/ai/TutorPanel';
import { fetchPublicLesson } from '@/lib/cms-lms-core';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

type PageProps = {
  params: Promise<{ slug: string; lessonSlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, lessonSlug } = await params;
  const data = await fetchPublicLesson(slug, lessonSlug);
  const site = await getSiteContext();
  return buildPageMetadata({
    pathname: `/cursos/${slug}/aula/${lessonSlug}`,
    title: data ? `${data.lesson.title} | ${data.course.title}` : 'Aula | Omnia',
    description: data?.lesson.summary ?? 'Aula do LMS Core Omnia.',
    hostname: site.hostname,
  });
}

export default async function AulaPage({ params }: PageProps) {
  const { slug, lessonSlug } = await params;
  const data = await fetchPublicLesson(slug, lessonSlug);
  if (!data) notFound();

  const { course, module: mod, lesson, assets } = data;

  return (
    <main className="py-10">
      <Container>
        <p className="mb-4 text-sm text-muted-foreground">
          <Link href="/cursos" className="underline">
            Cursos
          </Link>
          {' / '}
          <Link href={`/cursos/${course.slug}`} className="underline">
            {course.title}
          </Link>
          {mod ? ` / ${mod.title}` : null}
          {' / '}
          {lesson.title}
        </p>

        <SectionTitle title={lesson.title} subtitle={lesson.summary ?? undefined} />
        <p className="mb-6 text-xs uppercase tracking-wide text-muted-foreground">
          {lesson.type}
          {lesson.duration != null ? ` · ${lesson.duration} min` : ''}
        </p>

        <AskAiPanel
          context={{
            courseId: course.id,
            courseTitle: course.title,
            moduleId: mod?.id ?? null,
            moduleTitle: mod?.title ?? null,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            language: 'pt-BR',
          }}
        />

        <TutorPanel
          context={{
            courseId: course.id,
            courseTitle: course.title,
            moduleId: mod?.id ?? null,
            moduleTitle: mod?.title ?? null,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            language: 'pt-BR',
          }}
        />

        {lesson.externalUrl ? (
          <p className="mb-6 text-sm">
            Conteúdo externo:{' '}
            <a href={lesson.externalUrl} className="underline" target="_blank" rel="noreferrer">
              {lesson.externalUrl}
            </a>
          </p>
        ) : null}

        {lesson.content ? (
          <div className="prose prose-sm mb-8 max-w-none text-foreground">
            <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-xs">
              {typeof lesson.content === 'string'
                ? lesson.content
                : JSON.stringify(lesson.content, null, 2)}
            </pre>
          </div>
        ) : null}

        <section>
          <h2 className="mb-3 text-base font-semibold">Materiais</h2>
          {assets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum material anexado.</p>
          ) : (
            <ul className="space-y-3">
              {assets.map((asset) => (
                <li key={asset.id} className="rounded-md border border-border p-4 text-sm">
                  <p className="font-medium">
                    {asset.title}{' '}
                    <span className="text-xs uppercase text-muted-foreground">({asset.assetType})</span>
                  </p>
                  {asset.description ? (
                    <p className="mt-1 text-muted-foreground">{asset.description}</p>
                  ) : null}
                  {asset.media?.url ? (
                    <p className="mt-2">
                      <a
                        href={asset.media.url}
                        className="underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir arquivo
                        {asset.media.filename ? ` (${asset.media.filename})` : ''}
                      </a>
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </main>
  );
}
