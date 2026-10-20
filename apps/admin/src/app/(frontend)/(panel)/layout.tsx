import { AdminShell } from '@/components/layout/AdminShell';
import { requireStaffSession } from '@/lib/auth';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireStaffSession();

  return <AdminShell user={user}>{children}</AdminShell>;
}
