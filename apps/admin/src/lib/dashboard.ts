import { getPayload } from 'payload';

import config from '@payload-config';

export async function getDashboardStats() {
  try {
    const payload = await getPayload({ config });

    const [companies, tenants, media, users] = await Promise.all([
      payload.count({ collection: 'companies' }),
      payload.count({ collection: 'tenants' }),
      payload.count({ collection: 'media' }),
      payload.count({ collection: 'users' }),
    ]);

    return {
      companies: companies.totalDocs,
      tenants: tenants.totalDocs,
      media: media.totalDocs,
      users: users.totalDocs,
      online: true,
    };
  } catch {
    return {
      companies: 0,
      tenants: 0,
      media: 0,
      users: 0,
      online: false,
    };
  }
}
