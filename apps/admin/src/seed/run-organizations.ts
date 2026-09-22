import type { Payload } from 'payload';

import { organizationsSeed } from './organizations';

export async function seedOrganizations(
  payload: Payload,
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const org of organizationsSeed) {
    const existing = await payload.find({
      collection: 'organizations',
      where: { slug: { equals: org.slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    if (existing.docs[0]) {
      await payload.update({
        collection: 'organizations',
        id: existing.docs[0].id,
        data: {
          name: org.name,
          description: org.description,
          type: org.type,
          active: org.active,
        },
        overrideAccess: true,
      });
      updated += 1;
    } else {
      await payload.create({
        collection: 'organizations',
        data: org,
        overrideAccess: true,
      });
      created += 1;
    }
  }

  return { created, updated };
}
