import { redirect } from 'next/navigation';

import { parseSchoolKeyParam } from '@omnia/intelligent-learning';

import { getAdminLoginUrl } from '@/lib/auth/admin-url';

export default async function SchoolProfessorEntry({
  params,
}: {
  params: Promise<{ schoolKey: string }>;
}) {
  const { schoolKey: raw } = await params;
  const key = parseSchoolKeyParam(raw);
  if (!key) redirect('/login');
  redirect(getAdminLoginUrl('/professor'));
}
