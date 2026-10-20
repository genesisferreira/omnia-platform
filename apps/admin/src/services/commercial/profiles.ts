import type { Payload } from 'payload';
import type { CommercialProfile } from '@omnia/neurofrigo-commercial';

import { asUnknownRecord } from '../../lib/payload-relation-id';

function relId(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'object' && value && 'id' in value) {
    return String((value as { id: unknown }).id);
  }
  return String(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

export async function loadCommercialProfile(
  payload: Payload,
  key?: string | null,
): Promise<CommercialProfile | null> {
  const profileKey = (key || 'omnia-frigo-holding').trim();
  const res = await payload.find({
    collection: 'commercial-profiles',
    where: {
      and: [{ key: { equals: profileKey } }, { status: { equals: 'active' } }],
    },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });
  const d = res.docs[0];
  if (!d) {
    const fallback = await payload.find({
      collection: 'commercial-profiles',
      where: { status: { equals: 'active' } },
      limit: 1,
      depth: 1,
      overrideAccess: true,
    });
    if (!fallback.docs[0]) return null;
    return mapProfile(asUnknownRecord(fallback.docs[0]));
  }
  return mapProfile(asUnknownRecord(d));
}

function mapProfile(d: Record<string, unknown>): CommercialProfile {
  const models = Array.isArray(d.allowedModels) ? d.allowedModels : [];
  const modelKeys = models
    .map((m) => {
      if (m && typeof m === 'object' && 'key' in m) return String((m as { key: unknown }).key);
      return null;
    })
    .filter(Boolean) as string[];

  return {
    id: String(d.id),
    key: String(d.key),
    companyName: String(d.companyName || d.name || 'Omnia Frigo Holding'),
    companyId: relId(d.company),
    segment: String(d.segment || 'refrigeracao-industrial'),
    region: String(d.region || 'BR'),
    language: String(d.language || 'pt-BR'),
    allowedCatalog: asStringArray(d.allowedCatalog),
    businessLines: asStringArray(d.businessLines),
    commercialPolicy: String(d.commercialPolicy || ''),
    allowedModelKeys: modelKeys,
    status: (d.status as 'active' | 'disabled') || 'active',
  };
}
