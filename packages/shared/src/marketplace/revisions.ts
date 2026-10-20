import type { ListingStatus } from './constants';

export type ListingKind = 'product' | 'service';

export const REVISION_STATUS_VALUES = ['none', 'pending', 'rejected'] as const;
export type RevisionStatus = (typeof REVISION_STATUS_VALUES)[number];

/** Em anúncios já moderados, edições do parceiro ficam pendentes até a aprovação da equipe. */
export const LISTING_REVISION_STATUSES: readonly ListingStatus[] = ['published', 'suspended'];

const COMMON_FIELDS = [
  'title',
  'description',
  'category',
  'priceMode',
  'price',
  'images',
  'datasheet',
] as const;
const PRODUCT_ONLY_FIELDS = ['brand', 'model', 'sku', 'seo'] as const;

export type RevisionField = (typeof COMMON_FIELDS)[number] | (typeof PRODUCT_ONLY_FIELDS)[number];

export function revisionFieldsFor(kind: ListingKind): readonly RevisionField[] {
  return kind === 'product' ? [...COMMON_FIELDS, ...PRODUCT_ONLY_FIELDS] : COMMON_FIELDS;
}

export function requiresRevision(status: unknown): boolean {
  return (
    typeof status === 'string' && (LISTING_REVISION_STATUSES as readonly string[]).includes(status)
  );
}

const relId = (value: unknown): string | null => {
  if (value == null || value === '') return null;
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id;
    return id == null ? null : String(id);
  }
  return String(value);
};

/** Forma canônica para comparar/armazenar (ids de relação como string, imagens como pares). */
export function normalizeRevisionValue(field: RevisionField, value: unknown): unknown {
  if (field === 'images') {
    if (!Array.isArray(value)) return [];
    return value
      .map((row) => {
        const record = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
        const image = relId(record.image);
        if (!image) return null;
        const alt = typeof record.alt === 'string' && record.alt.trim() ? record.alt.trim() : null;
        return { image, alt };
      })
      .filter((row): row is { image: string; alt: string | null } => row !== null);
  }
  if (field === 'datasheet') return relId(value);
  if (field === 'seo') {
    const seo = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
    const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
    return { title: text(seo.title), description: text(seo.description) };
  }
  if (field === 'price') return typeof value === 'number' ? value : null;
  if (typeof value === 'string') return value.trim() === '' ? null : value;
  return value ?? null;
}

export type RevisionChanges = Partial<Record<RevisionField, { from: unknown; to: unknown }>>;

/**
 * Campos de `patch` que diferem do anúncio atual (só os sujeitos a moderação).
 * Campos ausentes no patch não entram; preços continuam em centavos inteiros.
 */
export function diffListingRevision(
  kind: ListingKind,
  current: Record<string, unknown>,
  patch: Record<string, unknown>,
): RevisionChanges {
  const changes: RevisionChanges = {};
  for (const field of revisionFieldsFor(kind)) {
    if (!(field in patch)) continue;
    const from = normalizeRevisionValue(field, current[field]);
    const to = normalizeRevisionValue(field, patch[field]);
    if (JSON.stringify(from) !== JSON.stringify(to)) changes[field] = { from, to };
  }
  return changes;
}

/**
 * Valor que o parceiro está editando: o da revisão pendente quando existir, senão o publicado.
 * Usado para acumular alterações (ex.: várias imagens) sobre a mesma revisão.
 */
export function effectiveRevisionValue(
  doc: Record<string, unknown>,
  field: RevisionField,
): unknown {
  const pending = doc.pendingRevision as
    { changes?: Record<string, { to?: unknown }> } | null | undefined;
  const change = pending?.changes?.[field];
  if (change && 'to' in change) return change.to;
  return normalizeRevisionValue(field, doc[field]);
}

/** Valores pendentes a aplicar no anúncio (para a aprovação), na forma aceita pelo Payload. */
export function revisionPatchFrom(changes: RevisionChanges): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [field, change] of Object.entries(changes)) {
    if (!change) continue;
    patch[field] = change.to;
  }
  return patch;
}
