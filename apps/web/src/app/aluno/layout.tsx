import { AcademicShell } from '@/components/academic/AcademicShell';
import { StudentAcademicGate } from '@/components/academic/StudentAcademicGate';
import { fetchAcademic } from '@/lib/academic/client';
import { requireAuthorizedDevice } from '@/lib/auth/device';
import { requirePortalSession } from '@/lib/auth/require-session';
import { getSessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePortalSession('/aluno');
  // Device Access Control (só student; OFF = no-op). Enforcement real no Admin.
  await requireAuthorizedDevice(user, await getSessionToken(), '/aluno');
  const ctx = await fetchAcademic<{
    context?: { academicAllowed?: boolean; schoolName?: string | null; schoolKey?: string | null };
  }>('ils/context', { user });
  const context = ctx.ok ? ctx.data.context : null;
  return (
    <AcademicShell
      role="student"
      userName={user.name || user.email}
      schoolName={context?.schoolName}
      schoolKey={context?.schoolKey}
    >
      <StudentAcademicGate academicAllowed={context?.academicAllowed !== false} />
      {children}
    </AcademicShell>
  );
}
