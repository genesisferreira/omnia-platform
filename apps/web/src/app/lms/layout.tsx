import type { Metadata } from 'next';

import { LmsShell } from '@/components/lms/LmsShell';
import { requirePortalSession } from '@/lib/auth/require-session';

export const metadata: Metadata = {
  title: 'Omnia LMS',
  description: 'Área de estudos Omnia — experiência do aluno via Connector',
  robots: { index: false, follow: false },
};

function displayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email: string;
}): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (user.name?.trim()) return user.name.trim();
  return user.email.split('@')[0] || 'Aluno';
}

export default async function LmsLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePortalSession('/lms');
  return <LmsShell userName={displayName(user)}>{children}</LmsShell>;
}
