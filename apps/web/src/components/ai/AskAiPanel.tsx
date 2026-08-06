'use client';

import { useState, useTransition } from 'react';

export type AskAiContext = {
  courseId: string | number;
  courseTitle?: string;
  moduleId?: string | number | null;
  moduleTitle?: string | null;
  lessonId?: string | number | null;
  lessonTitle?: string | null;
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

type ChatResponse = {
  ok: boolean;
  data?: {
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
  };
  error?: string;
};

export function AskAiPanel({ context }: { context: AskAiContext }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<ChatResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
            courseId: context.courseId,
            courseTitle: context.courseTitle,
            moduleId: context.moduleId,
            moduleTitle: context.moduleTitle,
            lessonId: context.lessonId,
            lessonTitle: context.lessonTitle,
            ownerCompanyId: context.ownerCompanyId,
            language: context.language || 'pt-BR',
          }),
        });
        const json = (await res.json()) as ChatResponse;
        if (!res.ok || !json.ok || !json.data) {
          setError(json.error || 'Falha ao consultar a IA');
          setAnswer(null);
          return;
        }
        setAnswer(json.data);
      } catch {
        setError('Falha de rede ao consultar a IA');
        setAnswer(null);
      }
    });
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
          <p className="text-sm text-muted-foreground">
            Pergunte sobre o conteúdo deste curso. As respostas usam a base autorizada e exibem
            fontes.
          </p>
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
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={pending || !question.trim()}
              onClick={submit}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {pending ? 'Consultando…' : 'Enviar'}
            </button>
            {answer ? (
              <span className="text-xs text-muted-foreground">
                {answer.tookMs} ms · {answer.provider}/{answer.model} · confiança{' '}
                {(answer.confidence * 100).toFixed(0)}%
              </span>
            ) : null}
          </div>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          {answer ? (
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Resposta</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{answer.text}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Fontes</h3>
                {answer.sources.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">Nenhuma fonte anexada.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {answer.sources.map((s) => (
                      <li
                        key={s.chunkId}
                        className="rounded-md border border-border/70 px-3 py-2 text-xs"
                      >
                        <div className="font-medium">
                          chunk:{s.chunkId}
                          {s.citation?.page != null ? ` · p.${s.citation.page}` : ''}
                          {' · '}
                          score {s.score.toFixed(2)}
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          {s.text.slice(0, 220)}
                          {s.text.length > 220 ? '…' : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
