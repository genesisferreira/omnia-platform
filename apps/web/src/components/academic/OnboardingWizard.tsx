'use client';

import Link from 'next/link';
import { useState } from 'react';
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

type AssessmentQ = {
  complete?: boolean;
  question?: { id: string; prompt: string; domainLabel?: string } | null;
  overall?: { overall?: number; label?: string };
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

export function OnboardingWizard(props: { initial: Onboarding }) {
  const router = useRouter();
  const [state, setState] = useState(props.initial);
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState<AssessmentQ | null>(null);
  const [error, setError] = useState<string | null>(null);
  const step = state.currentStep || 'explanation';

  async function run(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const data = await post(path, body);
      if (!data?.ok) {
        setError(data?.error?.message || 'Não foi possível continuar.');
        return;
      }
      if (data.onboarding) setState(data.onboarding);
      else setState((s) => ({ ...s, ...data }));
      if (path.includes('assessment')) {
        const nxt = data.question || data.complete ? data : await get('ils/onboarding/assessment');
        setQuestion(nxt);
        if (nxt?.complete) {
          const fresh = await get('ils/onboarding');
          if (fresh?.onboarding) setState(fresh.onboarding);
        }
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (state.academicAllowed && state.result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seu ponto de partida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>{state.result.summary}</p>
          <p className="text-sm text-muted-foreground">{state.result.nextAction}</p>
          <Button asChild>
            <Link href="/aluno">Ir para meus cursos</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 overflow-x-hidden">
      <BrandBanner schoolKey={state.schoolKey} area="onboarding" />
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {state.schoolName || 'Omnia LMS'} · onboarding
      </p>
      {step === 'explanation' || step === 'consent' ? (
        <Card>
          <CardHeader>
            <CardTitle>Antes de começar, queremos conhecer melhor você.</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>
              Antes de liberar sua área de estudos, vamos conhecer seu nível técnico, sua
              experiência e seus objetivos.
            </p>
            <p>
              Essa avaliação nos ajuda a adaptar conteúdos, exercícios e acompanhamento à sua
              realidade profissional. Ela não é uma prova de aprovação ou reprovação.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>O que avaliamos: experiência declarada e competências técnicas observáveis</li>
              <li>Como usamos: recomendações pedagógicas para você, professor e Tutor</li>
              <li>Privacidade: consentimento educacional versionado ({state.consentVersion})</li>
              <li>Tempo estimado: 10 a 20 minutos</li>
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row">
              {step === 'explanation' ? (
                <Button
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => run('ils/onboarding/start')}
                >
                  Começar
                </Button>
              ) : (
                <Button
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => run('ils/onboarding/consent')}
                >
                  Concordo e continuar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 'pcar' ? (
        <Card>
          <CardHeader>
            <CardTitle>Sua experiência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="min-h-11"
                disabled={busy}
                onClick={() =>
                  run('ils/onboarding/pcar', {
                    experienceYears: 3,
                    areas: ['comercial'],
                    technicalFamiliarity: 'operacional',
                    explanationPreference: 'pratico',
                    mathComfort: 'media',
                    readingComfort: 'media',
                    problemSolvingComfort: 'media',
                    schematicExperience: true,
                    studyAvailabilityHoursPerWeek: 6,
                  })
                }
              >
                Perfil comercial / refrigeração
              </Button>
              <Button
                className="min-h-11"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run('ils/onboarding/pcar', {
                    experienceYears: 3,
                    areas: ['eletricidade', 'comandos elétricos'],
                    technicalFamiliarity: 'operacional',
                    explanationPreference: 'pratico',
                    mathComfort: 'media',
                    readingComfort: 'media',
                    problemSolvingComfort: 'media',
                    schematicExperience: true,
                    studyAvailabilityHoursPerWeek: 6,
                  })
                }
              >
                Perfil elétrica / comandos
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 'goals' ? (
        <Card>
          <CardHeader>
            <CardTitle>Seus objetivos</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              disabled={busy}
              onClick={() =>
                run('ils/onboarding/goals', {
                  goals: ['melhorar_qualificacao', 'refrigeracao_comercial'],
                  notes: 'Quero evoluir na operação comercial.',
                })
              }
            >
              Continuar para avaliação técnica
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 'assessment' ? (
        <Card>
          <CardHeader>
            <CardTitle>Avaliação técnica inicial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Não é prova eliminatória. As questões se ajustam às suas respostas.
            </p>
            {!question?.question ? (
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const data = await get('ils/onboarding/assessment');
                  setQuestion(data);
                  setBusy(false);
                }}
              >
                Iniciar questões
              </Button>
            ) : (
              <>
                <p className="text-sm font-medium">{question.question.domainLabel}</p>
                <p>{question.question.prompt}</p>
                <div className="flex gap-3">
                  <Button
                    disabled={busy}
                    onClick={() =>
                      run('ils/onboarding/assessment/answer', {
                        questionId: question.question?.id,
                        value: 'true',
                      })
                    }
                  >
                    Verdadeiro
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      run('ils/onboarding/assessment/answer', {
                        questionId: question.question?.id,
                        value: 'false',
                      })
                    }
                  >
                    Falso
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
