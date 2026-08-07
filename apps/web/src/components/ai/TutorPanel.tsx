'use client';

import { useEffect, useState, useTransition } from 'react';

import type { AskAiContext } from '@/components/ai/AskAiPanel';

type Recommendation = {
  type: string;
  title: string;
  reason: string;
  lessonSlug?: string | null;
};

type StudyPlanStep = {
  order: number;
  moduleTitle: string;
  lessonTitle: string;
  rationale: string;
};

type TutorData = {
  sessionId: string | number;
  text: string;
  status: string;
  tookMs: number;
  confidence: number;
  level?: string;
  levelLabel?: string;
  encouragement?: string;
  personalizedHint?: string;
  recommendations?: Recommendation[];
  studyPlan?: { objective: string; steps: StudyPlanStep[]; estimatedLessons: number } | null;
  gaps?: Array<{ topic: string; reason: string; severity: string }>;
  student?: { progressPercent: number; studyTimeMinutes: number };
  sourceCount?: number;
};

type Turn = { question: string; answer: TutorData };

export function TutorPanel({ context }: { context: AskAiContext }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [sessionId, setSessionId] = useState<string | number | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<number | null>(null);
  const [nextLessons, setNextLessons] = useState<Array<{ title: string; slug: string }>>([]);
  const [wantPlan, setWantPlan] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/tutor/profile?courseId=${encodeURIComponent(String(context.courseId))}`)
      .then((r) => r.json())
      .then((json) => {
        const data = json?.data || json;
        if (data?.student?.progressPercent != null) {
          setProgress(Number(data.student.progressPercent));
        }
        if (Array.isArray(data?.nextLessons)) {
          setNextLessons(
            data.nextLessons.map((l: { title: string; slug: string }) => ({
              title: l.title,
              slug: l.slug,
            })),
          );
        }
      })
      .catch(() => undefined);
  }, [open, context.courseId]);

  function submit() {
    const q = question.trim();
    if (!q || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/tutor/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            question: q,
            sessionId,
            courseId: context.courseId,
            courseTitle: context.courseTitle,
            moduleId: context.moduleId,
            moduleTitle: context.moduleTitle,
            lessonId: context.lessonId,
            lessonTitle: context.lessonTitle,
            lessonObjectives: context.lessonObjectives,
            ownerCompanyId: context.ownerCompanyId,
            language: context.language || 'pt-BR',
            requestStudyPlan: wantPlan,
            objective: wantPlan ? q : undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok || json?.ok === false) {
          throw new Error(json?.error || 'Falha ao consultar o Tutor');
        }
        const data = (json?.data || json) as TutorData;
        setSessionId(data.sessionId);
        setTurns((prev) => [...prev, { question: q, answer: data }]);
        setQuestion('');
        if (data.student?.progressPercent != null) {
          setProgress(data.student.progressPercent);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro');
      }
    });
  }

  function resetSession() {
    setSessionId(null);
    setTurns([]);
    setError(null);
  }

  return (
    <section className="mt-10 border-t border-border/60 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tutor IA</p>
          <h2 className="mt-1 font-display text-2xl text-foreground">Aprendizado guiado</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Respostas adaptadas ao seu nível, com recomendações e plano a partir do LMS publicado.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          {open ? 'Fechar Tutor' : 'Conversar com o Tutor'}
        </button>
      </div>

      {open ? (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="text-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Progresso</p>
              <p className="mt-1 text-lg text-foreground">
                {progress != null ? `${Math.round(progress)}%` : '—'}
              </p>
            </div>
            <div className="text-sm sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Próximas aulas</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {nextLessons.length ? (
                  nextLessons.map((l) => <li key={l.slug}>· {l.title}</li>)
                ) : (
                  <li>· Carregando catálogo LMS…</li>
                )}
              </ul>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={wantPlan}
              onChange={(e) => setWantPlan(e.target.checked)}
            />
            Gerar plano de estudo a partir do objetivo
          </label>

          <div className="space-y-4">
            {turns.map((turn, idx) => (
              <article key={`${turn.answer.sessionId}-${idx}`} className="space-y-2 border-b border-border/40 pb-4">
                <p className="text-sm font-medium text-foreground">Você: {turn.question}</p>
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">{turn.answer.text}</div>
                <p className="text-xs text-muted-foreground">
                  {turn.answer.levelLabel || turn.answer.level || '—'} · {turn.answer.tookMs} ms ·
                  fontes {turn.answer.sourceCount ?? 0}
                  {turn.answer.personalizedHint ? ` · ${turn.answer.personalizedHint}` : ''}
                </p>
                {turn.answer.encouragement ? (
                  <p className="text-sm text-foreground">{turn.answer.encouragement}</p>
                ) : null}
                {turn.answer.recommendations?.length ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Recomendações</p>
                    <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                      {turn.answer.recommendations.map((r) => (
                        <li key={`${r.type}-${r.title}`}>
                          <span className="text-foreground">{r.title}</span> — {r.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {turn.answer.studyPlan?.steps?.length ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano de estudo</p>
                    <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                      {turn.answer.studyPlan.steps.map((s) => (
                        <li key={s.order}>
                          {s.moduleTitle}: {s.lessonTitle}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                {turn.answer.gaps?.length ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Lacunas</p>
                    <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                      {turn.answer.gaps.map((g) => (
                        <li key={g.topic}>
                          {g.topic} — {g.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          {pending ? (
            <p className="text-sm text-muted-foreground">Tutor respondendo…</p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              placeholder="Pergunte ao Tutor ou descreva seu objetivo…"
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              Enviar
            </button>
            <button
              type="button"
              onClick={resetSession}
              className="rounded-md border border-border px-4 py-2 text-sm"
            >
              Nova sessão
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
