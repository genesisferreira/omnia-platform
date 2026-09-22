import type { CollectionSlug, Payload } from 'payload';

export type PublicCourseCatalogItem = {
  title: string;
  slug: string | null;
  shortDescription: string | null;
  level: string | null;
  category: string | null;
  estimatedHours: number | null;
  providerHint: string | null;
};

/**
 * Publicado + visibility public — fonte de verdade do catálogo Concierge.
 */
export async function loadPublicCourseCatalog(
  payload: Payload,
  limit = 12,
): Promise<PublicCourseCatalogItem[]> {
  const result = await payload.find({
    collection: 'courses' as CollectionSlug,
    where: {
      and: [{ status: { equals: 'published' } }, { visibility: { equals: 'public' } }],
    },
    limit,
    sort: '-publishedAt',
    depth: 0,
    overrideAccess: true,
  });

  return result.docs.map((doc) => {
    const d = doc as {
      title?: string;
      slug?: string;
      shortDescription?: string | null;
      level?: string | null;
      category?: string | null;
      estimatedHours?: number | null;
    };
    return {
      title: String(d.title || '').trim() || 'Curso',
      slug: d.slug ? String(d.slug) : null,
      shortDescription: d.shortDescription ? String(d.shortDescription) : null,
      level: d.level ? String(d.level) : null,
      category: d.category ? String(d.category) : null,
      estimatedHours:
        d.estimatedHours != null && Number.isFinite(Number(d.estimatedHours))
          ? Number(d.estimatedHours)
          : null,
      providerHint: 'Fred do Frio / CTE (ecossistema Omnia)',
    };
  });
}

export function isCourseOrientedQuestion(question: string): boolean {
  return /curso|forma[cç][aã]o|treinamento|aula|cat[aá]logo|iniciante|estud/i.test(question);
}
