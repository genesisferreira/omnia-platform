'use client';

import { useEffect, useState, useTransition } from 'react';

type PortalView = {
  technicalLevel?: string;
  progressPercent?: number;
  competencies?: Array<{ label: string; score: number; trend: string }>;
  objectives?: { goals?: string[]; notes?: string | null };
  preferences?: string[];
  recommendations?: Array<{ type: string; title: string; reason: string }>;
  nextSteps?: string[];
  updatedAt?: string;
};

const GOAL_OPTIONS = [
  'emprego',
  'empresa_propria',
  'co2',
  'industrial',
  'hvac',
  'consultoria',
];

export function SipProfilePanel({ courseId }: { courseId: string }) {
  const [view, setView] = useState<PortalView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/sip/profile?courseId=${encodeURIComponent(courseId)}`, {
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Não foi possível carregar o perfil inteligente.');
        return;
      }
      const data = (json.data || json) as PortalView;
      setView(data);
      setGoals(Array.isArray(data.objectives?.goals) ? data.objectives!.goals! : []);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const saveGoals = () => {
    startTransition(async () => {
      const res = await fetch('/api/sip/motivation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, goals }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Falha ao salvar objetivos.');
        return;
      }
      setView((json.data || json) as PortalView);
    });
  };

  const toggleGoal = (g: string) => {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {pending && !view ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}

      {view ? (
        <>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-omnia-deep-blue">Visão geral</h2>
            <p className="text-sm text-omnia-graphite-light">
              Nível técnico: <strong>{view.technicalLevel || '—'}</strong>
              {' · '}
              Progresso: {Math.round(view.progressPercent || 0)}%
            </p>
            {view.preferences?.length ? (
              <p className="text-sm text-omnia-graphite-light">
                Preferências inferidas: {view.preferences.join(', ')}
              </p>
            ) : null}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-omnia-deep-blue">Competências</h2>
            <ul className="space-y-2">
              {(view.competencies || []).map((c) => (
                <li key={c.label} className="text-sm">
                  <div className="mb-1 flex justify-between gap-2">
                    <span>{c.label}</span>
                    <span className="text-muted-foreground">
                      {Math.round(c.score * 100)}% · {c.trend}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-muted">
                    <div
                      className="h-full bg-omnia-deep-blue"
                      style={{ width: `${Math.round(c.score * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-omnia-deep-blue">Objetivos profissionais</h2>
            <p className="text-sm text-omnia-graphite-light">
              Declarados por você — usados para personalizar recomendações.
            </p>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGoal(g)}
                  className={`rounded border px-3 py-1 text-sm ${
                    goals.includes(g)
                      ? 'border-omnia-deep-blue bg-omnia-deep-blue text-white'
                      : 'border-border bg-background'
                  }`}
                >
                  {g.replace('_', ' ')}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={saveGoals}
              disabled={pending}
              className="rounded bg-omnia-deep-blue px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              Salvar objetivos
            </button>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-omnia-deep-blue">Recomendações</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {(view.recommendations || []).map((r) => (
                <li key={`${r.type}-${r.title}`}>
                  <span className="font-medium">{r.title}</span>
                  <span className="text-muted-foreground"> — {r.reason}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-omnia-deep-blue">Próximos passos</h2>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {(view.nextSteps || []).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </section>
        </>
      ) : null}
    </div>
  );
}
