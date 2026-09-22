import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  CreateLessonForm,
  CreateModuleForm,
  AttachAssetForm,
} from '@/components/academic/TeacherForms';
import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function ProfessorCursoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const user = await requirePortalSession(`/professor/cursos/${id}`);
  const res = await fetchAcademic<{
    course?: {
      id: number;
      title: string;
      slug: string;
      schoolKey?: string | null;
      shortDescription?: string | null;
    };
    modules?: Array<{
      id: number;
      title: string;
      slug: string;
      lessons?: Array<{
        id: number;
        title: string;
        slug: string;
        type: string;
        published: boolean;
      }>;
    }>;
  }>(`teaching/courses/${id}`, { user });

  if (!res.ok || !res.data.course) {
    return (
      <div className="space-y-3">
        <h1 className="font-heading text-2xl font-semibold">Curso</h1>
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar este curso (sem autorização ou inexistente).
        </p>
        <Link href="/professor/cursos" className="underline text-sm">
          Voltar
        </Link>
      </div>
    );
  }

  const course = res.data.course;
  const modules = res.data.modules ?? [];
  const courseOptions = [
    {
      id: course.id,
      title: course.title,
      modules: modules.map((m) => ({ id: m.id, title: m.title })),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {course.schoolKey || 'escola'} · curso
        </p>
        <h1 className="font-heading text-2xl font-semibold">{course.title}</h1>
        {course.shortDescription ? (
          <p className="mt-2 text-sm text-muted-foreground">{course.shortDescription}</p>
        ) : null}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Módulos e aulas</h2>
        {!modules.length ? (
          <p className="text-sm text-muted-foreground">Este curso ainda não possui módulos.</p>
        ) : (
          modules.map((mod) => (
            <div key={mod.id} className="rounded-md border border-border p-4">
              <h3 className="font-medium">{mod.title}</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {(mod.lessons || []).map((lesson) => (
                  <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {lesson.title}{' '}
                      <span className="text-muted-foreground">
                        · {lesson.type} · {lesson.published ? 'publicado' : 'rascunho'}
                      </span>
                    </span>
                    <AttachAssetForm lessonId={lesson.id} />
                  </li>
                ))}
                {!mod.lessons?.length ? (
                  <li className="text-muted-foreground">Este módulo ainda não possui aulas.</li>
                ) : null}
              </ul>
            </div>
          ))
        )}
      </section>

      <CreateModuleForm courseId={course.id} />
      <CreateLessonForm courses={courseOptions} />
    </div>
  );
}
