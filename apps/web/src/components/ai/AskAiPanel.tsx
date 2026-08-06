'use client';

import { useState, useTransition } from 'react';

export type AskAiContext = {
  courseId: string | number;
  courseTitle?: string;
  moduleId?: string | number | null;
  moduleTitle?: string | null;
  lessonId?: string | number | null;
  lessonTitle?: string | null;
  lessonObjectives?: string | null;
  ownerCompanyId?: string | number | null;
  language?: string;
};

type Source = {
  chunkId: string;
  text: string;
  score: number;
  similarity: number;
  citation?: {
    knowledgeDocumentId?: string | null;
    courseId?: string | null;
    lessonId?: string | null;
    learningResourceId?: string | null;
    page?: number | null;
  };
};

type Explainability = {
  sourceCount: number;
  avgScore: number;
  confidence: number;
  documents: Array<{
    chunkId: string;
    knowledgeDocumentId: string | null;
    learningResourceId: string | null;
    page: number | null;
    score: number;
    similarity: number;
  }>;
  retrievalTookMs: number;
  llmTookMs: number;
  intent: string;
  justification: string;
};

type ChatData = {
  sessionId: string | number;
  text: string;
  sources: Source[];
  confidence: number;
  tookMs: number;
  model: string;
  provider: string;
  tokens: { prompt: number; completion: number; total: number };
  status: string;
  errorCode?: string | null;
  intent?: string | null;
  grounding?: { score: number } | null;
  explainability?: Explainability | null;
  sourceCount?: number;
};

type Turn = { question: string; answer: ChatData };

export function AskAiPanel({ context }: { context: AskAiContext }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [sessionId, setSessionId] = useState<string | number | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showSourcesFor, setShowSourcesFor] = useState<number | null>(null);
  const [showExplainFor, setShowExplainFor] = useState<number | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackDone, setFeedbackDone] = useState<Record<number, string>>({});

  function submit() {
    const q = question.trim();
    if (!q || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/ai/chat', {
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
          }),
        });
        const json = (await res.json()) as { ok?: boolean; data?: ChatData; error?: string };
        if (!res.ok || !json.ok || !json.data) {
          setError(json.error || 'Falha ao consultar a IA');
          return;
        }
        setSessionId(json.data.sessionId);
        setTurns((prev) => [...prev, { question: q, answer: json.data! }]);
        setQuestion('');
      } catch {
        setError('Falha de rede ao consultar a IA');
      }
    });
  }

  async function sendFeedback(turnIndex: number, rating: 'up' | 'down') {
    const turn = turns[turnIndex];
    if (!turn) return;
    try {
      const res = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sessionId: turn.answer.sessionId,
          rating,
          comment: feedbackComment || undefined,
        }),
      });
      const json = (await res.json()) as { ok?: boolean };
      if (res.ok && json.ok) {
        setFeedbackDone((prev) => ({ ...prev, [turnIndex]: rating }));
        setFeedbackFor(null);
        setFeedbackComment('');
      }
    } catch {
      /* ignore */
    }
  }

  async function copyAnswer(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  function newSession() {
    setSessionId(null);
    setTurns([]);
    setQuestion('');
    setError(null);
    setShowSourcesFor(null);
    setShowExplainFor(null);
    setFeedbackDone({});
  }

  return (
    <div className="my-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
      >
        {open ? 'Fechar chat da IA' : 'Perguntar à IA'}
      </button>

      {open ? (
        <div className="mt-4 rounded-lg border border-border bg-background p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Assistente Técnico Neurofrigo — respostas ancoradas no material autorizado, com fontes e
              continuidade nesta sessão.
            </p>
            {turns.length > 0 ? (
              <button
                type="button"
                onClick={newSession}
                className="shrink-0 text-xs underline text-muted-foreground"
              >
                Nova sessão
              </button>
            ) : null}
          </div>

          {turns.length > 0 ? (
            <div className="mt-4 max-h-[28rem] space-y-4 overflow-y-auto pr-1">
              {turns.map((turn, idx) => (
                <div key={`${turn.answer.sessionId}-${idx}`} className="space-y-2 border-b border-border/60 pb-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Você
                  </p>
                  <p className="text-sm">{turn.question}</p>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Assistente
                  </p>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{turn.answer.text}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{turn.answer.tookMs} ms</span>
                    <span>·</span>
                    <span>confiança {(turn.answer.confidence * 100).toFixed(0)}%</span>
                    <span>·</span>
                    <span>{turn.answer.sourceCount ?? turn.answer.sources.length} fontes</span>
                    {turn.answer.grounding ? (
                      <>
                        <span>·</span>
                        <span>grounding {(turn.answer.grounding.score * 100).toFixed(0)}%</span>
                      </>
                    ) : null}
                    {turn.answer.intent ? (
                      <>
                        <span>·</span>
                        <span>{turn.answer.intent}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      className="rounded border border-border px-2 py-1 text-xs"
                      onClick={() =>
                        setShowSourcesFor((v) => (v === idx ? null : idx))
                      }
                    >
                      Ver Fontes
                    </button>
                    <button
                      type="button"
                      className="rounded border border-border px-2 py-1 text-xs"
                      onClick={() =>
                        setShowExplainFor((v) => (v === idx ? null : idx))
                      }
                    >
                      Como esta resposta foi construída?
                    </button>
                    <button
                      type="button"
                      className="rounded border border-border px-2 py-1 text-xs"
                      onClick={() => copyAnswer(turn.answer.text)}
                    >
                      Copiar resposta
                    </button>
                    <button
                      type="button"
                      className="rounded border border-border px-2 py-1 text-xs"
                      onClick={() => setFeedbackFor((v) => (v === idx ? null : idx))}
                    >
                      Avaliar resposta
                    </button>
                  </div>

                  {showSourcesFor === idx ? (
                    <ul className="mt-2 space-y-2">
                      {turn.answer.sources.length === 0 ? (
                        <li className="text-xs text-muted-foreground">Nenhuma fonte.</li>
                      ) : (
                        turn.answer.sources.map((s) => (
                          <li
                            key={s.chunkId}
                            className="rounded-md border border-border/70 px-3 py-2 text-xs"
                          >
                            <div className="font-medium">
                              chunk:{s.chunkId}
                              {s.citation?.page != null ? ` · p.${s.citation.page}` : ''}
                              {' · score '}
                              {s.score.toFixed(2)}
                            </div>
                            <p className="mt-1 text-muted-foreground">
                              {s.text.slice(0, 220)}
                              {s.text.length > 220 ? '…' : ''}
                            </p>
                          </li>
                        ))
                      )}
                    </ul>
                  ) : null}

                  {showExplainFor === idx && turn.answer.explainability ? (
                    <div className="mt-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs space-y-1">
                      <p>{turn.answer.explainability.justification}</p>
                      <p>
                        Fontes: {turn.answer.explainability.sourceCount} · score médio{' '}
                        {turn.answer.explainability.avgScore.toFixed(2)} · retrieval{' '}
                        {turn.answer.explainability.retrievalTookMs} ms · LLM{' '}
                        {turn.answer.explainability.llmTookMs} ms
                      </p>
                      <ul className="list-disc pl-4">
                        {turn.answer.explainability.documents.map((d) => (
                          <li key={d.chunkId}>
                            doc {d.knowledgeDocumentId ?? '—'} · chunk {d.chunkId}
                            {d.page != null ? ` · p.${d.page}` : ''} · {d.score.toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {feedbackFor === idx ? (
                    <div className="mt-2 space-y-2 rounded-md border border-border/70 p-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-1 text-xs"
                          onClick={() => sendFeedback(idx, 'up')}
                        >
                          👍 Resposta útil
                        </button>
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-1 text-xs"
                          onClick={() => sendFeedback(idx, 'down')}
                        >
                          👎 Resposta não ajudou
                        </button>
                      </div>
                      <textarea
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        rows={2}
                        className="w-full rounded-md border border-border px-2 py-1 text-xs"
                        placeholder="O que estava faltando? (opcional)"
                      />
                    </div>
                  ) : null}

                  {feedbackDone[idx] ? (
                    <p className="text-xs text-muted-foreground">
                      Feedback registrado ({feedbackDone[idx] === 'up' ? 'útil' : 'não ajudou'}).
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <label className="mt-3 block text-sm font-medium" htmlFor="ask-ai-q">
            Sua pergunta
          </label>
          <textarea
            id="ask-ai-q"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Ex.: Como funciona a válvula de expansão?"
            disabled={pending}
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={pending || !question.trim()}
              onClick={submit}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {pending ? 'IA respondendo…' : 'Enviar'}
            </button>
            {pending ? (
              <span className="text-xs text-muted-foreground animate-pulse">
                Buscando fontes e gerando resposta…
              </span>
            ) : null}
          </div>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
