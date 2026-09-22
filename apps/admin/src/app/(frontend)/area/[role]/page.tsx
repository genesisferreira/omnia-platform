import { redirect } from 'next/navigation';

import { isScopedPortalRole } from '@omnia/constants';
import { getConfiguredPublicOrigin, resolveEstablishDestination } from '@omnia/shared';

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
  if (!user) {
    redirect(`/login?next=${encodeURIComponent('/ia')}`);
  }

  const dest = resolveEstablishDestination(rawRole, null);
  const portal = getConfiguredPublicOrigin({
    configuredUrl: process.env.NEXT_PUBLIC_APP_URL,
    nodeEnv: process.env.NODE_ENV,
    fallbackDev: 'http://localhost:3000',
  });
  if (!portal.ok) {
    redirect('/unauthorized');
  }
  redirect(`${portal.origin}${dest}`);
}
