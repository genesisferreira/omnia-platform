import { redirect } from 'next/navigation';

import { parseSchoolKeyParam } from '@omnia/intelligent-learning';

export default async function SchoolHomePage({
  params,
}: {
  params: Promise<{ schoolKey: string }>;
}) {
  const { schoolKey: raw } = await params;
  const key = parseSchoolKeyParam(raw);
  redirect(key ? `/escola/${key}/login` : '/login');
}
