'use client';

import { useEffect, useId, useState, useTransition } from 'react';

import type { AiChatData, AiTurn, AskAiContext, AssistantOption } from '@/components/ai/types';

export type AiChatWorkspaceProps = {
  context: AskAiContext;
  variant?: 'embedded' | 'command' | 'dock';
  /** public = Concierge anonymous (no login). */
  mode?: 'authenticated' | 'public';
  sessionId?: string | number | null;
  turns?: AiTurn[];
  assistantId?: string;
  onSessionIdChange?: (id: string | number | null) => void;
  onTurnsChange?: (turns: AiTurn[]) => void;
  onAssistantIdChange?: (id: string) => void;
  suggestions?: string[];
  className?: string;
  /** Academic shells: hide agent selector; auto-route only. */
  hideAssistantPicker?: boolean;
  brandLabel?: string;
};

const DEFAULT_SUGGESTIONS = [
  'Por onde começo neste conteúdo?',
  'Explique isso de forma mais simples.',
  'Quais são os riscos técnicos principais?',
  'Resuma o que é mais importante agora.',
];

const PUBLIC_SUGGESTIONS = [
  'O que é a Omnia Frigo?',
  'Quais serviços a Renovação oferece?',
  'Quais cursos vocês oferecem?',
  'Conhecer o Neurofrigo',
  'Qual empresa procurar para engenharia?',
];

function formatConfidenceLabel(value: unknown): string | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return `confiança ${Math.round(Math.max(0, Math.min(1, n)) * 100)}%`;
}

function friendlySourceTitle(s: {
  text: string;
  citation?: { page?: number | null } | null;
  index: number;
}): string {
  const cleaned = String(s.text || '')
    .replace(/EPIC16_PUBLIC_INSTITUTIONAL_V\d+/gi, '')
    .replace(/\[chunk:[^\]]+\]/gi, '')
    .replace(/^#+\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  const first = cleaned.split(/(?<=[.!?])\s+/)[0]?.trim() || cleaned;
  const snippet = first.slice(0, 72).trim() || `Trecho autorizado ${s.index + 1}`;
  const base = first.length > 72 ? `${snippet}…` : snippet;
  if (s.citation?.page != null && Number.isFinite(s.citation.page)) {
    return `${base} (p. ${s.citation.page})`;
  }
  return base;
}

export function AiChatWorkspace({
  context,
  variant = 'embedded',
  mode = 'authenticated',
  sessionId: controlledSessionId,
  turns: controlledTurns,
  assistantId: controlledAssistantId,
  onSessionIdChange,
  onTurnsChange,
  onAssistantIdChange,
  suggestions,
  className,
  hideAssistantPicker = false,
  brandLabel,
}: AiChatWorkspaceProps) {
  const isPublic = mode === 'public';
  const resolvedSuggestions = suggestions ?? (isPublic ? PUBLIC_SUGGESTIONS : DEFAULT_SUGGESTIONS);
  const baseId = useId();
  const [internalSessionId, setInternalSessionId] = useState<string | number | null>(null);
  const [internalTurns, setInternalTurns] = useState<AiTurn[]>([]);
  const [internalAssistantId, setInternalAssistantId] = useState('auto');
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showSourcesFor, setShowSourcesFor] = useState<number | null>(null);
  const [showExplainFor, setShowExplainFor] = useState<number | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackDone, setFeedbackDone] = useState<Record<number, string>>({});
  const [assistants, setAssistants] = useState<AssistantOption[]>([]);
  const [specialistLabel, setSpecialistLabel] = useState<string | null>(null);

  const sessionId = controlledSessionId !== undefined ? controlledSessionId : internalSessionId;
  const turns = controlledTurns !== undefined ? controlledTurns : internalTurns;
  const assistantId =
    controlledAssistantId !== undefined ? controlledAssistantId : internalAssistantId;

  function setSessionId(next: string | number | null) {
    onSessionIdChange?.(next);
    if (controlledSessionId === undefined) setInternalSessionId(next);
  }
  function setTurns(next: AiTurn[] | ((prev: AiTurn[]) => AiTurn[])) {
    const resolved = typeof next === 'function' ? next(turns) : next;
    onTurnsChange?.(resolved);
    if (controlledTurns === undefined) setInternalTurns(resolved);
  }
  function setAssistantId(next: string) {
    onAssistantIdChange?.(next);
    if (controlledAssistantId === undefined) setInternalAssistantId(next);
  }

  useEffect(() => {
    if (isPublic) {
      setAssistants([
        {
          id: 'concierge',
          key: 'concierge',
          name: 'Concierge',
          description: 'Atendimento institucional Omnia Frigo',
          category: 'concierge',
        },
      ]);
      setAssistantId('concierge');
      return;
    }
    const qs = new URLSearchParams();
    if (context.courseId != null && context.courseId !== '') {
      qs.set('courseId', String(context.courseId));
    }
    if (context.ownerCompanyId != null) {
      qs.set('companyId', String(context.ownerCompanyId));
    }
    fetch(`/api/ai/assistants${qs.size ? `?${qs}` : ''}`)
      .then((r) => r.json())
      .then((json) => {
        const list = (json?.data?.assistants || json?.assistants || []) as AssistantOption[];
        if (Array.isArray(list) && list.length) {
          setAssistants(list);
          setAssistantId(
            assistantId === 'auto' || list.some((a) => a.key === assistantId)
              ? assistantId
              : 'auto',
          );
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on context change only
  }, [context.courseId, context.ownerCompanyId, isPublic]);

  function newSession() {
    setSessionId(null);
    setTurns([]);
    setQuestion('');
    setError(null);
    setShowSourcesFor(null);
    setShowExplainFor(null);
    setFeedbackDone({});
    setSpecialistLabel(null);
  }

  function changeAssistant(next: string) {
    if (next === assistantId) return;
    setAssistantId(next);
    newSession();
  }

  function submit(preset?: string) {
    const q = (preset ?? question).trim();
    if (!q || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const endpoint = isPublic ? '/api/ai/public-chat' : '/api/ai/chat';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(
            isPublic
              ? {
                  question: q,
                  sessionId,
                  assistantId: 'concierge',
                  language: context.language || 'pt-BR',
                }
              : {
                  question: q,
                  sessionId,
                  assistantId,
                  courseId: context.courseId ?? null,
                  courseTitle: context.courseTitle ?? null,
                  moduleId: context.moduleId ?? null,
                  moduleTitle: context.moduleTitle ?? null,
                  lessonId: context.lessonId ?? null,
                  lessonTitle: context.lessonTitle ?? null,
                  lessonObjectives: context.lessonObjectives ?? null,
                  ownerCompanyId: context.ownerCompanyId ?? null,
                  language: context.language || 'pt-BR',
                },
          ),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          data?: AiChatData;
          error?: string;
          message?: string;
          retryAfterSeconds?: number;
        };
        if (!res.ok || !json.ok || !json.data) {
          if (res.status === 429 || json.error === 'RATE_LIMITED') {
            setError(
              json.message ||
                'Você enviou várias mensagens em pouco tempo. Aguarde alguns instantes e tente novamente.',
            );
          } else {
            setError(json.error || 'Falha ao consultar a IA');
          }
          return;
        }
        setSessionId(json.data.sessionId);
        setSpecialistLabel(json.data.specialistLabel || null);
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

  const selected = assistants.find((a) => a.key === assistantId);
  const isCompact = variant === 'dock';
  const shellClass =
    variant === 'command'
      ? 'flex h-full min-h-0 flex-col rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100'
      : variant === 'dock'
        ? 'flex h-full min-h-0 flex-col bg-zinc-950 text-zinc-100'
        : 'rounded-lg border border-border bg-background p-4 shadow-sm';

  return (
    <div className={`${shellClass} ${className || ''}`}>
      <div
        className={`flex flex-col gap-3 border-b border-zinc-800/80 p-4 sm:flex-row sm:items-start sm:justify-between ${
          variant === 'embedded' ? 'border-border/60' : ''
        }`}
      >
        <div className="space-y-2 min-w-0 flex-1">
          {isPublic ? (
            <div>
              <p className="text-sm font-medium">Concierge Omnia</p>
              <p
                className={`text-xs ${variant === 'embedded' ? 'text-muted-foreground' : 'text-zinc-500'}`}
              >
                Atendimento institucional — cursos, serviços e refrigeração.
              </p>
            </div>
          ) : hideAssistantPicker ? (
            <div>
              <p className="text-sm font-medium">{brandLabel || 'Assistente'}</p>
              <p
                className={`text-xs ${variant === 'embedded' ? 'text-muted-foreground' : 'text-zinc-500'}`}
              >
                Acompanhamento adaptado ao seu contexto. Você não precisa escolher agentes.
              </p>
            </div>
          ) : (
            <>
              <label className="block text-sm font-medium" htmlFor={`${baseId}-assistant`}>
                Conversar com
              </label>
              <select
                id={`${baseId}-assistant`}
                value={assistantId}
                onChange={(e) => changeAssistant(e.target.value)}
                className={`w-full max-w-md rounded-md border px-3 py-2 text-sm ${
                  variant === 'embedded'
                    ? 'border-border bg-background'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-100'
                }`}
                style={selected?.color ? { borderColor: selected.color } : undefined}
                aria-label="Selecionar assistente"
              >
                <option value="auto">Automático (recomendado)</option>
                {assistants.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.name}
                  </option>
                ))}
              </select>
            </>
          )}
          {!hideAssistantPicker ? (
            <p
              className={`text-sm ${variant === 'embedded' ? 'text-muted-foreground' : 'text-zinc-400'}`}
            >
              {assistantId === 'auto'
                ? 'A Omnia AI escolhe o especialista adequado conforme sua identidade e contexto.'
                : selected?.description ||
                  'Assistente Omnia — respostas ancoradas no material autorizado.'}
            </p>
          ) : null}
          {specialistLabel && !hideAssistantPicker ? (
            <p
              className={`text-xs ${variant === 'embedded' ? 'text-muted-foreground' : 'text-zinc-500'}`}
            >
              Especialista: {specialistLabel}
            </p>
          ) : null}
        </div>
        {turns.length > 0 ? (
          <button
            type="button"
            onClick={newSession}
            className={`shrink-0 text-xs underline ${
              variant === 'embedded' ? 'text-muted-foreground' : 'text-zinc-400'
            }`}
          >
            Nova conversa
          </button>
        ) : null}
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto p-4 ${isCompact ? 'max-h-none' : ''}`}>
        {turns.length === 0 ? (
          <div className="space-y-4 py-6">
            <h3 className={`text-lg font-semibold ${variant === 'embedded' ? '' : 'text-zinc-50'}`}>
              {isPublic
                ? 'Olá, sou o assistente da Omnia Frigo. Como posso ajudar?'
                : 'Como posso ajudar?'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {resolvedSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  disabled={pending}
                  className={`rounded-full border px-3 py-1.5 text-left text-xs transition hover:opacity-90 disabled:opacity-50 ${
                    variant === 'embedded'
                      ? 'border-border text-foreground'
                      : 'border-zinc-700 text-zinc-200 hover:border-cyan-500/60'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {turns.map((turn, idx) => (
              <div
                key={`${turn.answer.sessionId}-${idx}`}
                className={`space-y-2 border-b pb-4 ${
                  variant === 'embedded' ? 'border-border/60' : 'border-zinc-800'
                }`}
              >
                <p
                  className={`text-xs font-medium uppercase tracking-wide ${
                    variant === 'embedded' ? 'text-muted-foreground' : 'text-zinc-500'
                  }`}
                >
                  Você
                </p>
                <p className="text-sm">{turn.question}</p>
                <p
                  className={`text-xs font-medium uppercase tracking-wide ${
                    variant === 'embedded' ? 'text-muted-foreground' : 'text-cyan-400/90'
                  }`}
                >
                  {turn.answer.specialistLabel ||
                    selected?.name ||
                    turn.answer.assistantId ||
                    'Omnia AI'}
                </p>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {turn.answer.text}
                </div>
                {turn.answer.proposalMarkdown ? (
                  <div
                    className={`mt-3 rounded-md border p-3 ${
                      variant === 'embedded'
                        ? 'border-border bg-muted/30'
                        : 'border-zinc-800 bg-zinc-900/80'
                    }`}
                  >
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide opacity-70">
                      Proposta
                    </p>
                    <div className="whitespace-pre-wrap text-sm">
                      {turn.answer.proposalMarkdown}
                    </div>
                  </div>
                ) : null}
                {turn.answer.troubleshootingMarkdown ? (
                  <div
                    className={`mt-3 rounded-md border p-3 ${
                      variant === 'embedded'
                        ? 'border-border bg-muted/30'
                        : 'border-zinc-800 bg-zinc-900/80'
                    }`}
                  >
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide opacity-70">
                      Troubleshooting
                    </p>
                    <div className="whitespace-pre-wrap text-sm">
                      {turn.answer.troubleshootingMarkdown}
                    </div>
                  </div>
                ) : null}
                {variant === 'command' ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    {Number.isFinite(turn.answer.tookMs) ? (
                      <>
                        <span>{turn.answer.tookMs} ms</span>
                        <span>·</span>
                      </>
                    ) : null}
                    {formatConfidenceLabel(turn.answer.confidence) ? (
                      <>
                        <span>{formatConfidenceLabel(turn.answer.confidence)}</span>
                        <span>·</span>
                      </>
                    ) : null}
                    <span>{turn.answer.sourceCount ?? turn.answer.sources.length} fontes</span>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    className={`rounded border px-2 py-1 text-xs ${
                      variant === 'embedded' ? 'border-border' : 'border-zinc-700'
                    }`}
                    onClick={() => setShowSourcesFor((v) => (v === idx ? null : idx))}
                  >
                    Ver Fontes
                  </button>
                  <button
                    type="button"
                    className={`rounded border px-2 py-1 text-xs ${
                      variant === 'embedded' ? 'border-border' : 'border-zinc-700'
                    }`}
                    onClick={() => setShowExplainFor((v) => (v === idx ? null : idx))}
                  >
                    Como foi construída
                  </button>
                  <button
                    type="button"
                    className={`rounded border px-2 py-1 text-xs ${
                      variant === 'embedded' ? 'border-border' : 'border-zinc-700'
                    }`}
                    onClick={() => copyAnswer(turn.answer.text)}
                  >
                    Copiar
                  </button>
                  <button
                    type="button"
                    className={`rounded border px-2 py-1 text-xs ${
                      variant === 'embedded' ? 'border-border' : 'border-zinc-700'
                    }`}
                    onClick={() => setFeedbackFor((v) => (v === idx ? null : idx))}
                  >
                    Avaliar
                  </button>
                </div>
                {showSourcesFor === idx ? (
                  <ul className="mt-2 space-y-2">
                    {turn.answer.sources.length === 0 ? (
                      <li className="text-xs opacity-70">Nenhuma fonte.</li>
                    ) : (
                      turn.answer.sources.map((s, sourceIdx) => (
                        <li
                          key={s.chunkId}
                          className={`rounded-md border px-3 py-2 text-xs ${
                            variant === 'embedded' ? 'border-border/70' : 'border-zinc-800'
                          }`}
                        >
                          <div className="font-medium">
                            {friendlySourceTitle({
                              text: s.text,
                              citation: s.citation,
                              index: sourceIdx,
                            })}
                          </div>
                          <p className="mt-1 opacity-70">
                            {s.text
                              .replace(/EPIC16_PUBLIC_INSTITUTIONAL_V\d+/gi, '')
                              .replace(/\[chunk:[^\]]+\]/gi, '')
                              .replace(/\s+/g, ' ')
                              .trim()
                              .slice(0, 220)}
                            {s.text.length > 220 ? '…' : ''}
                          </p>
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}
                {showExplainFor === idx && turn.answer.explainability ? (
                  <div
                    className={`mt-2 space-y-1 rounded-md border px-3 py-2 text-xs ${
                      variant === 'embedded'
                        ? 'border-border/70 bg-muted/20'
                        : 'border-zinc-800 bg-zinc-900/60'
                    }`}
                  >
                    <p>{turn.answer.explainability.justification}</p>
                  </div>
                ) : null}
                {turn.answer.suggestedActions && turn.answer.suggestedActions.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {turn.answer.suggestedActions.map((action) => (
                      <button
                        key={action.question}
                        type="button"
                        disabled={pending}
                        onClick={() => submit(action.question)}
                        className={`rounded-full border px-3 py-1 text-xs transition hover:opacity-90 disabled:opacity-50 ${
                          variant === 'embedded'
                            ? 'border-border text-foreground'
                            : 'border-zinc-700 text-zinc-200 hover:border-cyan-500/60'
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                {feedbackFor === idx ? (
                  <div
                    className={`mt-2 space-y-2 rounded-md border p-3 ${
                      variant === 'embedded' ? 'border-border/70' : 'border-zinc-800'
                    }`}
                  >
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={`rounded border px-2 py-1 text-xs ${
                          variant === 'embedded' ? 'border-border' : 'border-zinc-700'
                        }`}
                        onClick={() => sendFeedback(idx, 'up')}
                      >
                        Útil
                      </button>
                      <button
                        type="button"
                        className={`rounded border px-2 py-1 text-xs ${
                          variant === 'embedded' ? 'border-border' : 'border-zinc-700'
                        }`}
                        onClick={() => sendFeedback(idx, 'down')}
                      >
                        Não ajudou
                      </button>
                    </div>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      rows={2}
                      className={`w-full rounded-md border px-2 py-1 text-xs ${
                        variant === 'embedded'
                          ? 'border-border'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-100'
                      }`}
                      placeholder="O que estava faltando? (opcional)"
                    />
                  </div>
                ) : null}
                {feedbackDone[idx] ? (
                  <p className="text-xs opacity-70">
                    Feedback registrado ({feedbackDone[idx] === 'up' ? 'útil' : 'não ajudou'}).
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className={`border-t p-4 ${variant === 'embedded' ? 'border-border/60' : 'border-zinc-800'}`}
      >
        <label className="block text-sm font-medium" htmlFor={`${baseId}-q`}>
          Sua pergunta
        </label>
        <textarea
          id={`${baseId}-q`}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={variant === 'dock' ? 2 : 3}
          className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
            variant === 'embedded'
              ? 'border-border bg-background'
              : 'border-zinc-700 bg-zinc-900 text-zinc-100'
          }`}
          placeholder="Pergunte com base no contexto atual…"
          disabled={pending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            disabled={pending || !question.trim()}
            onClick={() => submit()}
            className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
              variant === 'embedded'
                ? 'border border-border'
                : 'bg-cyan-600 text-white hover:bg-cyan-500'
            }`}
          >
            {pending ? 'IA respondendo…' : 'Enviar'}
          </button>
          {pending ? (
            <span className="animate-pulse text-xs opacity-70">
              Buscando fontes e gerando resposta…
            </span>
          ) : (
            <span className="text-xs opacity-50">Ctrl/⌘ + Enter</span>
          )}
        </div>
        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
      </div>
    </div>
  );
}
