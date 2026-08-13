import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LessonPlayer } from '@/components/academic/LessonPlayer';
import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string; lessonSlug: string }> };

export default async function AlunoAulaPage({ params }: PageProps) {
  const { slug, lessonSlug } = await params;
  const user = await requirePortalSession(`/aluno/cursos/${slug}/aula/${lessonSlug}`);
  const res = await fetchAcademic<{
    course?: { title?: string };
    lesson?: {
      id: number;
      title: string;
      type?: string | null;
      summary?: string | null;
      completed?: boolean;
    };
    assets?: Array<{
      id: number;
      title?: string | null;
      assetType?: string | null;
      media?: { url?: string | null; mimeType?: string | null; filename?: string | null } | null;
    }>;
    prev?: { slug: string; title: string } | null;
    next?: { slug: string; title: string } | null;
    tutorContext?: {
      courseId: number;
      courseTitle: string;
      lessonId: number;
      lessonTitle: string;
    };
  }>(`courses/${slug}/lessons/${lessonSlug}`, { user });
  if (!res.ok || !res.data.lesson || !res.data.tutorContext) notFound();
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <Link href={`/aluno/cursos/${slug}`} className="underline">
          Voltar ao curso
        </Link>
      </p>
      <LessonPlayer
        courseSlug={slug}
        lesson={res.data.lesson}
        assets={res.data.assets ?? []}
        prev={res.data.prev}
        next={res.data.next}
        tutorContext={res.data.tutorContext}
      />
    </div>
  );
}
