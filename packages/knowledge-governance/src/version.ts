import { createHash } from 'node:crypto';

import { ASSESSMENT_SECRET_TAGS } from './constants';

/** Stable content fingerprint for version integrity. */
export function hashContentVersion(parts: Array<string | number | null | undefined>): string {
  const normalized = parts
    .map((p) => (p == null ? '' : String(p)))
    .join('\n---\n')
    .normalize('NFC')
    .trim();
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export function versionsMatch(
  approvedHash: string | null | undefined,
  currentHash: string | null | undefined,
): boolean {
  if (!approvedHash || !currentHash) return false;
  return approvedHash === currentHash;
}

/** Detect assessment/gabarito material that must never enter general RAG. */
export function isAssessmentSecretContent(input: {
  title?: string | null;
  tags?: string[] | null;
  assetType?: string | null;
  resourceType?: string | null;
  explicitSecret?: boolean | null;
}): boolean {
  if (input.explicitSecret === true) return true;
  const tags = (input.tags ?? []).map((t) => t.toLowerCase());
  if (tags.some((t) => (ASSESSMENT_SECRET_TAGS as readonly string[]).includes(t))) return true;
  if (tags.some((t) => t.includes('gabarito') || t.includes('answer_key'))) return true;
  const title = (input.title ?? '').toLowerCase();
  if (
    /\bgabarito\b/.test(title) ||
    /\banswer\s*key\b/.test(title) ||
    /\bchave\s+de\s+respostas?\b/.test(title)
  ) {
    return true;
  }
  return false;
}
