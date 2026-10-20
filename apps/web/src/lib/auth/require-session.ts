import { redirect } from 'next/navigation';

import { getAdminLoginUrl } from './admin-url';
import { fetchMe } from './payload-client';
import { getSessionToken } from './session';
import type { PortalUser } from './types';

export async function requirePortalSession(returnPath = '/minha-conta'): Promise<PortalUser> {
  const token = await getSessionToken();
  if (!token) {
    redirect(getAdminLoginUrl(returnPath));
  }

  const result = await fetchMe(token);
  if (!result.ok) {
    redirect(getAdminLoginUrl(returnPath));
  }

  return result.data;
}
