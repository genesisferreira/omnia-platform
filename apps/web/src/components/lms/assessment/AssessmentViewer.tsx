'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@omnia/ui';
import type { AssessmentDescriptor } from '@omnia/assessment-engine';

import { useAssessmentProvider } from '@/components/lms/assessment/AssessmentProvider';
import {
  CompletionRendererLazy,
  FeedbackRendererLazy,
  GradeRendererLazy,
  getLazyAssessmentRenderer,
} from '@/components/lms/assessment/renderers/registry';

export type AssessmentViewerProps = {
  descriptor: AssessmentDescriptor;
};

function AssessmentViewerInner(props: AssessmentViewerProps) {
  const { engine, resolve } = useAssessmentProvider();
  const [localCompleted, setLocalCompleted] = useState(false);
  const opened = useRef(false);

  const resolved = useMemo(() => resolve(props.descriptor), [resolve, props.descriptor]);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const r = engine.open(props.descriptor);
    engine.viewGrade(r);
    engine.viewFeedback(r);
    return () => {
      engine.close(r);
      opened.current = false;
    };
  }, [engine, props.descriptor]);

  const TypeRenderer = useMemo(
    () => getLazyAssessmentRenderer(resolved.rendererKey),
    [resolved.rendererKey],
  );

  function handleComplete() {
    if (localCompleted || resolved.completion.completed) return;
    engine.complete(resolved);
    setLocalCompleted(true);
  }

  const done = localCompleted || resolved.completion.completed;

  return (
    <Card
      className="shadow-lms-card animate-lms-fade-in"
      aria-label={`Avaliação: ${resolved.metadata.name}`}
    >
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{resolved.metadata.name}</CardTitle>
          <Badge variant="secondary" aria-label={`Status: ${resolved.metadata.statusLabel}`}>
            {resolved.metadata.statusLabel}
          </Badge>
          <Badge variant="outline">{resolved.type}</Badge>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Disponibilidade</dt>
            <dd className="font-medium">
              {resolved.availability.available ? 'Disponível' : 'Indisponível'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Tentativas</dt>
            <dd className="font-medium">
              {resolved.attempts.max != null
                ? `${resolved.attempts.used ?? 0}/${resolved.attempts.max}`
                : '— (Connector RO)'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Prazo</dt>
            <dd className="font-medium">
              {resolved.availability.dueAt
                ? new Date(resolved.availability.dueAt).toLocaleString('pt-BR')
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Tempo estimado</dt>
            <dd className="font-medium">
              {resolved.metadata.estimatedMinutes != null
                ? `${resolved.metadata.estimatedMinutes} min`
                : '—'}
            </dd>
          </div>
        </dl>
        {resolved.metadata.description ? (
          <p className="text-sm text-muted-foreground">{resolved.metadata.description}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">{resolved.metadata.instructions}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <TypeRenderer assessment={resolved} />
        <GradeRendererLazy assessment={resolved} />
        <FeedbackRendererLazy assessment={resolved} />
        <CompletionRendererLazy assessment={resolved} />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={done ? 'secondary' : 'outline'}
            disabled={done}
            aria-pressed={done}
            onClick={handleComplete}
          >
            {done ? 'Atividade concluída (local)' : 'Marcar visualização como concluída'}
          </Button>
          <p className="text-xs text-muted-foreground self-center">
            Conclusão local via Learning Engine — sem write Moodle.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export const AssessmentViewer = memo(AssessmentViewerInner);
