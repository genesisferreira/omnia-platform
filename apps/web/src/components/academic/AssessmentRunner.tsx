'use client';

import { useState } from 'react';
import { Button } from '@omnia/ui';

type Question = {
  id: number;
  type: string;
  points: number;
  options?: { choices?: Array<{ id: string; label: string }> };
  prompt?: string;
};

export function AssessmentRunner(props: {
  assessmentId: number;
  title: string;
  instructions?: string | null;
  questions: Question[];
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    await fetch(`/api/academic/assessments/${props.assessmentId}/start`, { method: 'POST' });
    const res = await fetch(`/api/academic/assessments/${props.assessmentId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: Object.entries(answers).map(([questionId, value]) => ({
          questionId: Number(questionId),
          value,
        })),
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      score?: number | null;
      needsManualGrade?: boolean;
      status?: string;
      error?: { message?: string };
    } | null;
    setBusy(false);
    if (!res.ok) {
      setResult(data?.error?.message || 'Não foi possível enviar.');
      return;
    }
    if (data?.needsManualGrade) {
      setResult('Enviado. Questões dissertativas aguardam correção do professor.');
    } else {
      setResult(
        data?.score == null
          ? 'Enviado. A nota será publicada pelo professor.'
          : `Enviado. Correção automática: ${data.score}%. A publicação da nota é do professor.`,
      );
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">{props.title}</h1>
      {props.instructions ? (
        <p className="text-sm text-muted-foreground">{props.instructions}</p>
      ) : null}
      {props.questions.map((q) => (
        <fieldset key={q.id} className="rounded-md border border-border p-4">
          <legend className="text-sm font-medium">Questão {q.id}</legend>
          <p className="mb-3 text-sm">{q.prompt || `Tipo ${q.type}`}</p>
          {(q.options?.choices || []).map((c) => (
            <label key={c.id} className="mb-1 flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`q-${q.id}`}
                value={c.id}
                onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: c.id }))}
              />
              {c.label}
            </label>
          ))}
          {q.type === 'short_answer' || q.type === 'essay' ? (
            <textarea
              className="mt-2 w-full rounded-md border border-border bg-background p-2 text-sm"
              rows={q.type === 'essay' ? 5 : 2}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            />
          ) : null}
        </fieldset>
      ))}
      <Button type="button" onClick={() => void submit()} disabled={busy || !!result}>
        {busy ? 'Enviando…' : 'Enviar respostas'}
      </Button>
      {result ? <p className="text-sm">{result}</p> : null}
    </div>
  );
}
