import Link from 'next/link';
import { Alert, Breadcrumb, EmptyState } from '@omnia/ui';

import { requirePortalSession } from '@/lib/auth/require-session';
import { fetchLmsConnector } from '@/lib/lms/connector';

export const dynamic = 'force-dynamic';

export default async function LmsGradesPage() {
  const user = await requirePortalSession('/lms/notas');
  const coursesRes = await fetchLmsConnector<{
    items?: Array<{
      moodleCourseId: number;
      course: { displayName?: string; fullName?: string } | null;
    }>;
  }>('courses', { search: 'page=1&pageSize=20', user });

  if (!coursesRes.ok) {
    return (
      <Alert variant="destructive" title="Erro ao carregar notas">
        Connector indisponível.
      </Alert>
    );
  }

  const items = coursesRes.data?.items || [];
  const blocks = await Promise.all(
    items.map(async (item) => {
      const g = await fetchLmsConnector<{
        grades?: Array<{
          itemName: string;
          gradeFormatted: string | null;
          percentage: number | null;
        }>;
      }>('grades', { user, search: `courseId=${item.moodleCourseId}` });
      return {
        id: item.moodleCourseId,
        title: item.course?.displayName || item.course?.fullName || `Curso ${item.moodleCourseId}`,
        grades: g.ok ? g.data?.grades || [] : [],
      };
    }),
  );

  const hasAny = blocks.some((b) => b.grades.length > 0);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'LMS', href: '/lms' },
          { label: 'Notas' },
        ]}
        linkComponent={Link}
      />
      <h1 className="font-heading text-3xl font-bold">Notas</h1>
      {!hasAny ? (
        <EmptyState title="Sem notas" description="Ainda não há itens de nota para exibir." />
      ) : (
        <div className="space-y-6">
          {blocks.map((block) =>
            block.grades.length === 0 ? null : (
              <section key={block.id} className="space-y-2">
                <h2 className="font-heading text-lg font-semibold">
                  <Link href={`/lms/cursos/${block.id}`} className="hover:underline">
                    {block.title}
                  </Link>
                </h2>
                <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                  {block.grades.map((grade, idx) => (
                    <li
                      key={`${grade.itemName}-${idx}`}
                      className="flex justify-between gap-2 px-4 py-3 text-sm"
                    >
                      <span>{grade.itemName}</span>
                      <span className="font-medium">
                        {grade.gradeFormatted ||
                          (grade.percentage != null
                            ? `${Math.round(grade.percentage)}%`
                            : '—')}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      )}
    </div>
  );
}
