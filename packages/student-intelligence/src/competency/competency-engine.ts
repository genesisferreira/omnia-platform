import {
  COMPETENCY_LABELS,
  DEFAULT_COMPETENCY_KEYS,
  type CompetencyState,
  type EvidenceRecord,
} from '../domain/types';

import { detectCompetencyFromText } from '../evidence/detect';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Competency Engine — scores a partir de evidências acumuladas (nunca de uma única interação).
 */
export function computeCompetencies(input: {
  evidence: EvidenceRecord[];
  previous?: CompetencyState[];
  now?: string;
}): CompetencyState[] {
  const now = input.now || new Date().toISOString();
  const prevMap = new Map((input.previous || []).map((c) => [c.key, c]));
  const buckets = new Map<string, { strengths: number[]; confidences: number[] }>();

  for (const key of DEFAULT_COMPETENCY_KEYS) {
    buckets.set(key, { strengths: [], confidences: [] });
  }

  for (const ev of input.evidence) {
    const key =
      ev.competencyKey ||
      detectCompetencyFromText(ev.summary) ||
      (ev.payload && typeof ev.payload.topic === 'string'
        ? detectCompetencyFromText(String(ev.payload.topic))
        : null);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, { strengths: [], confidences: [] });
    const b = buckets.get(key)!;
    b.strengths.push(clamp01(ev.strength));
    b.confidences.push(clamp01(ev.confidence));
  }

  const out: CompetencyState[] = [];
  for (const [key, b] of buckets) {
    const prev = prevMap.get(key);
    const n = b.strengths.length;
    let score = prev?.score ?? 0.2;
    let confidence = prev?.confidence ?? 0.1;
    if (n >= 2) {
      const avg = b.strengths.reduce((a, c) => a + c, 0) / n;
      score = clamp01(prev ? prev.score * 0.55 + avg * 0.45 : avg * 0.7 + 0.15);
      confidence = clamp01(
        Math.min(
          0.95,
          (b.confidences.reduce((a, c) => a + c, 0) / n) * (0.5 + Math.min(n, 10) / 20),
        ),
      );
    } else if (n === 1 && prev) {
      score = clamp01(prev.score * 0.9 + b.strengths[0]! * 0.1);
      confidence = clamp01(prev.confidence * 0.95);
    }

    let trend: CompetencyState['trend'] = 'stable';
    if (prev) {
      const delta = score - prev.score;
      if (delta > 0.04) trend = 'up';
      else if (delta < -0.04) trend = 'down';
    }

    out.push({
      key,
      label: COMPETENCY_LABELS[key] || key,
      score: Number(score.toFixed(3)),
      confidence: Number(confidence.toFixed(3)),
      trend,
      lastUpdate: n > 0 || !prev ? now : prev.lastUpdate,
    });
  }

  return out.sort((a, b) => b.score - a.score);
}
