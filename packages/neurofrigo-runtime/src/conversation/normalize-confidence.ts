/**
 * Confidence must never surface as NaN/Infinity in APIs or UI.
 */
export function normalizeConfidence(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return Number(n.toFixed(3));
}

export function formatConfidencePercent(value: unknown): string | null {
  const n = normalizeConfidence(value);
  if (n == null) return null;
  return `${Math.round(n * 100)}%`;
}
