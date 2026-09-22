import { redirect } from 'next/navigation';

import { parseSchoolKeyParam } from '@omnia/intelligent-learning';

import { getAdminLoginUrl } from '@/lib/auth/admin-url';

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Portal does not host credentials. School-aware entry goes to /escola/{key}/login;
 * otherwise redirect to Admin login and preserve return path.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) || {};
  const rawSchool = params.school || params.schoolKey;
  const school = parseSchoolKeyParam(Array.isArray(rawSchool) ? rawSchool[0] : rawSchool);
  if (school) {
    const rawNext = params.next;
    const nextPath = Array.isArray(rawNext) ? rawNext[0] : rawNext;
    const qs =
      typeof nextPath === 'string' && nextPath.startsWith('/')
        ? `?next=${encodeURIComponent(nextPath)}`
        : '';
    redirect(`/escola/${school}/login${qs}`);
  }
  const rawNext = params.next;
  const nextPath = Array.isArray(rawNext) ? rawNext[0] : rawNext;
  redirect(
    getAdminLoginUrl(typeof nextPath === 'string' && nextPath.startsWith('/') ? nextPath : '/ia'),
  );
}
