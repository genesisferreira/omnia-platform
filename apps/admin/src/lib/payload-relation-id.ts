/**
 * After `payload generate:types` (and Next build), Payload postgres relationships are
 * `number | Doc`, not `string | number`. Coerce before create/update.
 *
 * Quality must run `payload generate:types` before `tsc` so this class of errors is
 * caught before the Build job (see CI + R0.3 audit).
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

/**
 * Safe relation id from Payload find/create results:
 * number | { id } | null/undefined → number | undefined
 */
export function relationId(
  value: string | number | { id?: string | number | null } | null | undefined,
): number | undefined {
  if (value == null) return undefined;
  if (typeof value === 'object') return toPayloadRelationId(value.id ?? undefined);
  return toPayloadRelationId(value);
}

/** Next typecheck rejects Payload docs `as Record<string, unknown>` without unknown. */
export function asUnknownRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

/** Payload json fields reject `unknown` and empty `{}` without an index signature. */
export function asPayloadJson(
  value: unknown,
): string | number | boolean | unknown[] | { [k: string]: unknown } | null {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) return value as unknown[];
  if (typeof value === 'object') return value as { [k: string]: unknown };
  return String(value);
}
