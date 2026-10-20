import Link from 'next/link';

import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';
import { PublishLessonButton } from '@/components/academic/TeacherForms';

export const dynamic = 'force-dynamic';

export default async function ProfessorRascunhosPage() {
  const user = await requirePortalSession('/professor/rascunhos');
  const res = await fetchAcademic<{
    items?: Array<{
      id: number;
      title: string;
      slug: string;
      published: boolean;
      updatedAt?: string | null;
      courseId?: number | null;
      courseTitle?: string | null;
      moduleTitle?: string | null;
      schoolKey?: string | null;
    }>;
  }>('teaching/lessons?status=draft', { user });
  const items = res.ok ? (res.data.items ?? []) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Meus rascunhos</h1>
          <p className="text-sm text-muted-foreground">
            Aulas salvas e ainda não publicadas. Se a API confirmar o save, o item aparece aqui.
          </p>
        </div>
        <Link href="/professor/conteudo" className="text-sm underline">
          Criar nova aula
        </Link>
      </div>
      {!items.length ? (
        <p className="rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          Você ainda não criou nenhum rascunho.{' '}
          <Link href="/professor/conteudo" className="underline">
            Criar aula
          </Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-md border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.courseTitle || 'Curso'} · {item.moduleTitle || 'Módulo'} · rascunho
                  {item.updatedAt ? ` · atualizado ${item.updatedAt}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.courseId ? (
                  <Link
                    href={`/professor/cursos/${item.courseId}`}
                    className="rounded-md border border-border px-3 py-2 text-sm"
                  >
                    Abrir curso
                  </Link>
                ) : null}
                <PublishLessonButton lessonId={item.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
