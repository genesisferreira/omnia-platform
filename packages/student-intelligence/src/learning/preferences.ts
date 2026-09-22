import type {
  CompetencyState,
  EvidenceRecord,
  LearningPreference,
  PreferenceState,
} from '../domain/types';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Inferência de preferências pelo comportamento — nunca pergunta direta.
 */
export function inferPreferences(input: {
  evidence: EvidenceRecord[];
  competencies: CompetencyState[];
}): PreferenceState[] {
  const scores: Record<LearningPreference, { score: number; n: number }> = {
    visual: { score: 0, n: 0 },
    pratico: { score: 0, n: 0 },
    textual: { score: 0, n: 0 },
    analitico: { score: 0, n: 0 },
    experimental: { score: 0, n: 0 },
  };

  for (const ev of input.evidence) {
    const t = ev.summary.toLowerCase();
    if (/diagrama|figura|esquema|visual/i.test(t)) {
      scores.visual.score += ev.strength;
      scores.visual.n += 1;
    }
    if (/pr[aá]tic|exerc[ií]cio|laboratorio|manuten/i.test(t)) {
      scores.pratico.score += ev.strength;
      scores.pratico.n += 1;
    }
    if (/ler|texto|manual|documento|norma/i.test(t)) {
      scores.textual.score += ev.strength;
      scores.textual.n += 1;
    }
    if (/compar|versus|an[aá]lis|c[aá]lcul|termodin/i.test(t)) {
      scores.analitico.score += ev.strength;
      scores.analitico.n += 1;
    }
    if (/teste|experim|comission|troubleshoot|falha/i.test(t)) {
      scores.experimental.score += ev.strength;
      scores.experimental.n += 1;
    }
    if (ev.sourceType === 'question') {
      scores.textual.score += 0.2;
      scores.textual.n += 1;
    }
    if (ev.sourceType === 'exercise' || ev.sourceType === 'attempt') {
      scores.pratico.score += 0.3;
      scores.pratico.n += 1;
    }
  }

  // Fallback suave a partir de competências
  const top = input.competencies[0];
  if (top && top.key === 'termodinamica') {
    scores.analitico.score += 0.2;
    scores.analitico.n += 1;
  }
  if (top && (top.key === 'comandos' || top.key === 'eletricidade')) {
    scores.pratico.score += 0.2;
    scores.pratico.n += 1;
  }

  return (Object.keys(scores) as LearningPreference[])
    .map((key) => {
      const b = scores[key];
      const avg = b.n ? b.score / b.n : 0.15;
      return {
        key,
        score: Number(clamp01(avg).toFixed(3)),
        confidence: Number(clamp01(b.n / 8).toFixed(3)),
        evidenceCount: b.n,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function recommendLevel(competencies: CompetencyState[]): string {
  const avg =
    competencies.length === 0
      ? 0.2
      : competencies.reduce((s, c) => s + c.score, 0) / competencies.length;
  if (avg >= 0.8) return 'specialist';
  if (avg >= 0.6) return 'advanced';
  if (avg >= 0.4) return 'intermediate';
  return 'beginner';
}
