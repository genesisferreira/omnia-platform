import type { PromptKind, PromptVersionRecord } from '../domain/types';

const KIND_ORDER: PromptKind[] = ['system', 'security', 'style', 'domain', 'compliance'];

/**
 * Compõe o system prompt a partir das versões ativas (sem tocar no PromptBuilder de intenção).
 */
export function composeSystemPrompt(
  prompts: PromptVersionRecord[],
  fallbackSystem?: string,
): string {
  const byKind = new Map<PromptKind, PromptVersionRecord>();
  for (const p of prompts) {
    const isActive = p.active || p.status === 'active';
    if (!isActive || p.status === 'retired' || p.status === 'draft') continue;
    const prev = byKind.get(p.kind);
    if (!prev || p.version > prev.version) byKind.set(p.kind, p);
  }

  const parts: string[] = [];
  for (const kind of KIND_ORDER) {
    const row = byKind.get(kind);
    if (row?.body?.trim()) {
      parts.push(`## ${kind.toUpperCase()}\n${row.body.trim()}`);
    }
  }

  if (!parts.length && fallbackSystem) return fallbackSystem;
  return parts.join('\n\n');
}

export function pickActivePromptVersions(
  all: PromptVersionRecord[],
  assistantKey: string,
): PromptVersionRecord[] {
  return all.filter(
    (p) =>
      p.assistantKey === assistantKey &&
      (p.active || p.status === 'active') &&
      p.status !== 'retired' &&
      p.status !== 'draft',
  );
}
