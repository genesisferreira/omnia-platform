'use client';

import type { ResolvedAssessment } from '@omnia/assessment-engine';

export type AssessmentRendererProps = {
  assessment: ResolvedAssessment;
};

function Panel(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-muted/30 p-4" aria-label={props.title}>
      <h3 className="mb-2 text-sm font-semibold text-foreground">{props.title}</h3>
      <div className="space-y-2 text-sm text-muted-foreground">{props.children}</div>
    </section>
  );
}

export function QuizRenderer(props: AssessmentRendererProps) {
  const a = props.assessment;
  return (
    <Panel title="Quiz (visualização)">
      <p>{a.metadata.instructions}</p>
      <p role="note" className="rounded-md border border-dashed border-border bg-card p-3">
        Runner de quiz e submissão estão fora deste épico (Connector read-only). Metadados, status,
        nota e conclusão vêm do Connector.
      </p>
    </Panel>
  );
}

export function AssignmentRenderer(props: AssessmentRendererProps) {
  const a = props.assessment;
  return (
    <Panel title="Tarefa (visualização)">
      <p>{a.metadata.instructions}</p>
      <p role="note" className="rounded-md border border-dashed border-border bg-card p-3">
        Entrega de assignment Omnia não está habilitada. Write API Moodle = sprint futura.
      </p>
    </Panel>
  );
}

export function FeedbackRenderer(props: AssessmentRendererProps) {
  const f = props.assessment.feedback;
  if (!f.available) {
    return (
      <Panel title="Feedback">
        <p>Feedback ainda não disponível.</p>
      </Panel>
    );
  }
  return (
    <Panel title="Feedback">
      <p>{f.summary}</p>
    </Panel>
  );
}

export function GradeRenderer(props: AssessmentRendererProps) {
  const g = props.assessment.grade;
  if (!g?.published) {
    return (
      <Panel title="Nota">
        <p>Nota ainda não publicada.</p>
      </Panel>
    );
  }
  return (
    <Panel title="Nota">
      <p className="text-foreground">
        <span className="font-medium">{g.itemName}: </span>
        {g.gradeFormatted || (g.percentage != null ? `${Math.round(g.percentage)}%` : '—')}
      </p>
    </Panel>
  );
}

export function CompletionRenderer(props: AssessmentRendererProps) {
  const c = props.assessment.completion;
  return (
    <Panel title="Conclusão">
      <p>
        Status:{' '}
        <strong className="text-foreground">
          {c.completed ? 'Concluída' : 'Em andamento / não iniciada'}
        </strong>
      </p>
      {c.timeCompleted ? (
        <p>Concluída em {new Date(c.timeCompleted).toLocaleString('pt-BR')}</p>
      ) : null}
    </Panel>
  );
}

export function UnknownAssessmentRenderer(props: AssessmentRendererProps) {
  return (
    <Panel title="Atividade">
      <p>
        Tipo “{props.assessment.metadata.modName}” sem renderer dedicado —
        UnknownAssessmentRenderer.
      </p>
      <p>{props.assessment.metadata.instructions}</p>
    </Panel>
  );
}
