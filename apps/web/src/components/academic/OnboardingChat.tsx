'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@omnia/ui';

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

async function get(path: string) {
  const res = await fetch(`/api/academic/${path}`, { cache: 'no-store' });
  return res.json();
}

function greeting(state: Onboarding): string {
  const school = state.schoolName || 'sua escola';
  return `Olá. Bem-vindo(a) ao ${school}.\n\nAntes de liberar sua área de estudos, quero conhecer um pouco da sua experiência e dos seus objetivos.\n\nIsso não é uma prova para aprovar ou reprovar você. Vou usar suas respostas para adaptar conteúdos, exercícios e o acompanhamento durante sua formação.\n\nPodemos começar?`;
}

export function OnboardingChat(props: { initial: Onboarding }) {
  const router = useRouter();
  const [state, setState] = useState<Onboarding>({
    ...props.initial,
    currentStep: props.initial.currentStep || 'explanation',
  });
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<AssessmentQ | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    { role: 'assistant', text: greeting(props.initial) },
  ]);

  const step = state.currentStep || 'explanation';

  useEffect(() => {
    if (state.academicAllowed && state.result) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `${state.result?.summary || 'Perfil inicial pronto.'}\n\n${state.result?.nextAction || 'Sua área acadêmica foi liberada.'}`,
        },
      ]);
    }
  }, [state.academicAllowed, state.result]);

  const quickActions = useMemo(() => {
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
    if (state.academicAllowed) return ['Ir para meus cursos'];
    return [];
  }, [step, question, state.academicAllowed]);

  async function advance(userText: string) {
    const text = userText.trim();
    if (!text || busy) return;
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

      if (step === 'explanation') {
        const data = await post('ils/onboarding/start');
        if (!data?.ok) throw new Error(data?.error?.message || 'Falha ao iniciar');
        if (data.onboarding) setState(data.onboarding);
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            text: `Perfeito. Para seguir, preciso do seu consentimento educacional (versão ${data.onboarding?.consentVersion || state.consentVersion || 'atual'}). Seus dados serão usados só para adaptar a formação. Você concorda?`,
          },
        ]);
        return;
      }

      if (step === 'consent') {
        const data = await post('ils/onboarding/consent');
        if (!data?.ok) throw new Error(data?.error?.message || 'Falha no consentimento');
        if (data.onboarding) setState(data.onboarding);
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            text: 'Obrigado. Me conte: você já trabalha com refrigeração? Se sim, em qual área (comercial, industrial, HVAC, elétrica/comandos) e há quanto tempo aproximadamente?',
          },
        ]);
        return;
      }

      if (step === 'pcar') {
        const electrical = /el[eé]tric|comando|hvac|come[cç]ando/.test(lower);
        const data = await post('ils/onboarding/pcar', {
          experienceYears: /come[cç]ando|nunca|n[aã]o/.test(lower) ? 0 : 3,
          areas: electrical ? ['eletricidade', 'comandos elétricos'] : ['comercial'],
          technicalFamiliarity: 'operacional',
          explanationPreference: 'pratico',
          mathComfort: 'media',
          readingComfort: 'media',
          problemSolvingComfort: 'media',
          schematicExperience: !/come[cç]ando|nunca|n[aã]o/.test(lower),
          studyAvailabilityHoursPerWeek: 6,
          notes: text,
        });
        if (!data?.ok) throw new Error(data?.error?.message || 'Falha no perfil');
        if (data.onboarding) setState(data.onboarding);
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            text: 'Entendi. Quais são seus objetivos principais nesta formação? Por exemplo: melhorar qualificação, operar câmaras, avançar em comandos elétricos…',
          },
        ]);
        return;
      }

      if (step === 'goals') {
        const data = await post('ils/onboarding/goals', {
          goals: [/qualifica/.test(lower) ? 'melhorar_qualificacao' : 'refrigeracao_comercial'],
          notes: text,
        });
        if (!data?.ok) throw new Error(data?.error?.message || 'Falha nos objetivos');
        if (data.onboarding) setState(data.onboarding);
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            text: 'Agora vou fazer algumas perguntas técnicas adaptativas — curtas, uma de cada vez. Não é eliminatório. Digite “Iniciar questões” quando estiver pronto.',
          },
        ]);
        return;
      }

      if (step === 'assessment') {
        if (!question?.question) {
          const data = await get('ils/onboarding/assessment');
          setQuestion(data);
          if (data?.question) {
            setMessages((m) => [
              ...m,
              {
                role: 'assistant',
                text: `${data.question.domainLabel || 'Questão'}\n\n${data.question.prompt}\n\nResponda Verdadeiro ou Falso.`,
              },
            ]);
          } else if (data?.complete) {
            const fresh = await get('ils/onboarding');
            if (fresh?.onboarding) setState(fresh.onboarding);
          }
          return;
        }
        const value = /falso|false|n[aã]o/.test(lower) ? 'false' : 'true';
        const data = await post('ils/onboarding/assessment/answer', {
          questionId: question.question.id,
          value,
        });
        if (!data?.ok) throw new Error(data?.error?.message || 'Falha na resposta');
        if (data.complete || data.question?.complete) {
          const fresh = await get('ils/onboarding');
          if (fresh?.onboarding) setState(fresh.onboarding);
          setQuestion({ complete: true });
          return;
        }
        const nxt = data.question ? data : await get('ils/onboarding/assessment');
        setQuestion(nxt);
        if (nxt?.question) {
          setMessages((m) => [
            ...m,
            {
              role: 'assistant',
              text: `${nxt.question.domainLabel || 'Próxima'}\n\n${nxt.question.prompt}`,
            },
          ]);
        }
        return;
      }

      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: 'Pode continuar — estou acompanhando seu onboarding. Se preferir, use um dos atalhos abaixo.',
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível continuar agora.');
    } finally {
      setBusy(false);
      router.refresh();
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
          <div className="max-h-[50vh] space-y-3 overflow-y-auto rounded-md border border-border bg-muted/20 p-3">
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
