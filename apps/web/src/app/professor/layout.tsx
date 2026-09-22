import { redirect } from 'next/navigation';

import { AcademicShell } from '@/components/academic/AcademicShell';
import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePortalSession('/professor');
  const allowed =
    user.role === 'instructor' ||
    user.role === 'admin' ||
    user.role === 'super_admin' ||
    user.role === 'editor';
  if (!allowed) {
    redirect('/aluno');
  }
  const ctx = await fetchAcademic<{
    context?: { schoolName?: string | null; schoolKey?: string | null };
  }>('ils/context', { user });
  return (
    <AcademicShell
      role="teacher"
      userName={user.name || user.email}
      schoolName={ctx.ok ? ctx.data.context?.schoolName : null}
      schoolKey={ctx.ok ? ctx.data.context?.schoolKey : null}
    >
      {children}
    </AcademicShell>
  );
}
