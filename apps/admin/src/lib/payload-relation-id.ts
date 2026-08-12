/**
 * After `next build` generates types, Payload postgres relationships are
 * `number | Doc`, not `string | number`. Coerce before create/update.
 */
export function toPayloadRelationId(id: string | number | null | undefined): number | undefined {
  if (id == null || id === '') return undefined;
  const n = typeof id === 'number' ? id : Number(id);
  return Number.isFinite(n) ? n : undefined;
}

export function requirePayloadRelationId(id: string | number | null | undefined): number {
  const n = toPayloadRelationId(id);
  if (n == null) {
    throw new Error(`INVALID_RELATION_ID:${String(id)}`);
  }
  return n;
}

/** Next typecheck rejects Payload docs `as Record<string, unknown>` without unknown. */
export function asUnknownRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
