'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@omnia/ui';
import {
  ONBOARDING_GENERIC_FALLBACK,
  assistantPromptForOnboardingStep,
  coerceOnboardingStep,
} from '@omnia/intelligent-learning';

import { BrandBanner } from '@/components/academic/BrandContext';

type Onboarding = {
  status?: string;
  currentStep?: string;
  schoolName?: string | null;
  schoolKey?: string | null;
  consentVersion?: string;
  academicAllowed?: boolean;
  result?: { summary?: string; nextAction?: string } | null;
};

type ChatMsg = { role: 'assistant' | 'user'; text: string };

type AssessmentQ = {
  complete?: boolean;
  question?: { id: string; prompt: string; domainLabel?: string } | null;
};

async function post(path: string, body?: unknown) {
  const res = await fetch(`/api/academic/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : '{}',
  });
  return res.json();
}

function openingMessage(state: Onboarding): string {
  const step = coerceOnboardingStep(state.currentStep, 'explanation');
  if (state.academicAllowed && state.result) {
    return `${state.result.summary || 'Perfil inicial pronto.'}\n\n${state.result.nextAction || 'Sua área acadêmica foi liberada.'}`;
  }
  return assistantPromptForOnboardingStep(step, { schoolName: state.schoolName });
}

export function OnboardingChat(props: { initial: Onboarding }) {
  const router = useRouter();
  const [state, setState] = useState<Onboarding>({
    ...props.initial,
    currentStep: coerceOnboardingStep(props.initial.currentStep, 'explanation'),
  });
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<AssessmentQ | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    { role: 'assistant', text: openingMessage(props.initial) },
  ]);
  const lastSubmitRef = useRef<string | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  const step = coerceOnboardingStep(state.currentStep, 'explanation');

  const quickActions = useMemo(() => {
    if (state.academicAllowed) return ['Ir para meus cursos'];
    if (step === 'explanation') return ['Sim, vamos começar'];
    if (step === 'consent') return ['Concordo e continuar'];
    if (step === 'pcar') {
      return [
        'Trabalho com refrigeração comercial',
        'Trabalho com elétrica / comandos',
        'Estou começando agora',
      ];
    }
    if (step === 'goals')
      return ['Quero melhorar minha qualificação', 'Quero refrigeração comercial'];
    if (step === 'assessment')
      return question?.question ? ['Verdadeiro', 'Falso'] : ['Iniciar questões'];
    return ['Sim, vamos começar'];
  }, [step, question, state.academicAllowed]);

  function scrollToLatest() {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  async function advance(userText: string) {
    const text = userText.trim();
    if (!text || busy) return;
    const submitKey = `${step}:${text.toLowerCase()}:${question?.question?.id || ''}`;
    if (lastSubmitRef.current === submitKey) return;
    lastSubmitRef.current = submitKey;
    setBusy(true);
    setError(null);
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    try {
      const lower = text.toLowerCase();
      if (state.academicAllowed || lower.includes('ir para meus cursos')) {
        router.push('/aluno');
        return;
      }

      const data = await post('ils/onboarding/turn', {
        text,
        questionId: question?.question?.id,
      });
      if (!data?.ok) throw new Error(data?.error?.message || 'Falha ao continuar');
      if (data.onboarding) setState(data.onboarding);
      if (data.question) setQuestion(data.question);
      if (!data.progressed) lastSubmitRef.current = null;
      const reply = String(data.assistantMessage || '').trim();
      if (reply && reply !== ONBOARDING_GENERIC_FALLBACK) {
        setMessages((m) => [...m, { role: 'assistant', text: reply }]);
      } else if (reply === ONBOARDING_GENERIC_FALLBACK) {
        setError('Não foi possível avançar com essa resposta. Tente de novo.');
      }
      if (data.onboarding?.academicAllowed) router.refresh();
      queueMicrotask(scrollToLatest);
    } catch (err) {
      lastSubmitRef.current = null;
      setError(err instanceof Error ? err.message : 'Não foi possível continuar agora.');
    } finally {
      setBusy(false);
    }
  }

  if (state.academicAllowed && state.result) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <BrandBanner schoolKey={state.schoolKey} area="onboarding" />
        <Card>
          <CardHeader>
            <CardTitle>Seu ponto de partida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{state.result.summary}</p>
            <p className="text-sm text-muted-foreground">{state.result.nextAction}</p>
            <Button onClick={() => router.push('/aluno')}>Ir para meus cursos</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <BrandBanner schoolKey={state.schoolKey} area="onboarding" />
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {state.schoolName || 'Omnia LMS'} · onboarding conversacional
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Assistente educacional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            ref={threadRef}
            className="max-h-[50vh] space-y-3 overflow-y-auto rounded-md border border-border bg-muted/20 p-3"
          >
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`whitespace-pre-wrap rounded-md px-3 py-2 text-sm ${
                  m.role === 'assistant' ? 'bg-background' : 'bg-foreground text-background'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button
                key={action}
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void advance(action)}
              >
                {action}
              </Button>
            ))}
          </div>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void advance(input);
            }}
          >
            <input
              className="min-h-11 flex-1 rounded-md border border-border bg-background px-3 text-sm"
              placeholder="Escreva sua resposta…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <Button type="submit" className="min-h-11" disabled={busy || !input.trim()}>
              Enviar
            </Button>
          </form>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
