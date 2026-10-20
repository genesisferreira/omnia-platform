import type { Endpoint, PayloadRequest } from 'payload';

const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=30';

/**
 * Lista organizações ativas do grupo Omnia (cadastro / preferências do Portal).
 */
export const publicOrganizationsEndpoint: Endpoint = {
  path: '/omnia/public-organizations',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      const result = await req.payload.find({
        collection: 'organizations',
        where: { active: { equals: true } },
        sort: 'name',
        limit: 50,
        depth: 0,
        overrideAccess: true,
      });

      const docs = result.docs.map((doc) => ({
        id: doc.id,
        name: doc.name,
        slug: doc.slug,
        type: doc.type,
        description: doc.description ?? null,
      }));

      return Response.json(
        { ok: true, docs },
        { status: 200, headers: { 'Cache-Control': CACHE_CONTROL } },
      );
    } catch {
      return Response.json(
        {
          ok: false,
          error: { code: 'INTERNAL_ERROR', message: 'Não foi possível listar organizações.' },
        },
        { status: 500, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  },
};
