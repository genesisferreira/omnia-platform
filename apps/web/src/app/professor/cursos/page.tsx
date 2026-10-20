import Link from 'next/link';

import { CreateCourseForm } from '@/components/academic/TeacherForms';
import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function ProfessorCursosPage() {
  const user = await requirePortalSession('/professor/cursos');
  const res = await fetchAcademic<{
    items?: Array<{ id: number; title: string; slug: string; schoolKey?: string | null }>;
  }>('teaching/courses', { user });
  const items = res.ok ? (res.data.items ?? []) : [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Meus cursos</h1>
        <p className="text-sm text-muted-foreground">
          Abra um curso para gerenciar módulos, aulas e materiais.
        </p>
      </div>
      {!items.length ? (
        <p className="rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          Você ainda não possui cursos atribuídos. Crie um rascunho abaixo.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((c) => (
            <li key={c.id}>
              <Link
                href={`/professor/cursos/${c.id}`}
                className="block rounded-md border border-border px-3 py-3 hover:bg-muted/40"
              >
                <span className="font-medium">{c.title}</span>
                <span className="ml-2 text-muted-foreground">
                  /{c.slug}
                  {c.schoolKey ? ` · ${c.schoolKey}` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <CreateCourseForm />
    </div>
  );
}
