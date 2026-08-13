import { redirect } from 'next/navigation';

import { isScopedPortalRole } from '@omnia/constants';

import { getAuthSession } from '@/lib/auth';

type AreaPageProps = {
  params: Promise<{ role: string }>;
};

/**
 * Legacy Admin placeholders (/area/student etc.) — send users to the Portal.
 * Session cookie on admin host is not used; LoginForm already bridges to Portal.
 */
export default async function ScopedAreaPage({ params }: AreaPageProps) {
  const { role: rawRole } = await params;
  if (!isScopedPortalRole(rawRole)) {
    redirect('/unauthorized');
  }

  const { user } = await getAuthSession();
  const portalBase = (process.env.NEXT_PUBLIC_APP_URL || 'https://omniafrigo.com.br').replace(
    /\/$/,
    '',
  );

  if (!user) {
    redirect(`/login?next=${encodeURIComponent('/ia')}`);
  }

  const dest = rawRole === 'instructor' ? '/professor' : rawRole === 'student' ? '/aluno' : '/ia';
  redirect(`${portalBase}${dest}`);
}
