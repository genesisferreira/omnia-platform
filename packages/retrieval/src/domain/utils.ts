import { createHash } from 'node:crypto';

/** Checksum estável do texto do chunk (para invalidação de embeddings). */
export function chunkChecksum(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Similaridade cosseno em [0,1] aproximada a partir de [-1,1]. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  const raw = dot / (Math.sqrt(na) * Math.sqrt(nb));
  return Math.max(0, Math.min(1, (raw + 1) / 2));
}

export function l2Normalize(vector: number[]): number[] {
  let n = 0;
  for (const v of vector) n += v * v;
  const denom = Math.sqrt(n) || 1;
  return vector.map((v) => v / denom);
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function toId(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}
