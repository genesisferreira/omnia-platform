import { redirect } from 'next/navigation';

import { getAdminLoginUrl } from '@/lib/auth/admin-url';

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Portal does not host credentials. Redirect to Admin login and preserve return path.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) || {};
  const rawNext = params.next;
  const nextPath = Array.isArray(rawNext) ? rawNext[0] : rawNext;
  redirect(
    getAdminLoginUrl(
      typeof nextPath === 'string' && nextPath.startsWith('/') ? nextPath : '/ia',
    ),
  );
}
