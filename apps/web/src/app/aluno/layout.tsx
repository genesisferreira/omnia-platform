import { AcademicShell } from '@/components/academic/AcademicShell';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePortalSession('/aluno');
  return (
    <AcademicShell role="student" userName={user.name || user.email}>
      {children}
    </AcademicShell>
  );
}
