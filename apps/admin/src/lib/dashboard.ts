import { headers as getHeaders } from 'next/headers';
import { getPayload } from 'payload';

import config from '@payload-config';

import { hasStaffAccess } from '@/access/rbac';

export type DashboardStats = {
  companies: number | null;
  tenants: number | null;
  media: number | null;
  users: number | null;
  online: boolean | null;
  error: string | null;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const headers = await getHeaders();
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers });

    if (!hasStaffAccess(user)) {
      return {
        companies: null,
        tenants: null,
        media: null,
        users: null,
        online: null,
        error: 'Sessão inválida.',
      };
    }

    const [companies, tenants, media, users] = await Promise.all([
      payload.count({ collection: 'companies', overrideAccess: false, user }),
      payload.count({ collection: 'tenants', overrideAccess: false, user }),
      payload.count({ collection: 'media', overrideAccess: false, user }),
      payload.count({ collection: 'users', overrideAccess: false, user }),
    ]);

    return {
      companies: companies.totalDocs,
      tenants: tenants.totalDocs,
      media: media.totalDocs,
      users: users.totalDocs,
      online: true,
      error: null,
    };
  } catch {
    return {
      companies: null,
      tenants: null,
      media: null,
      users: null,
      online: false,
      error: 'Não foi possível carregar os indicadores no momento.',
    };
  }
}
