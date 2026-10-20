'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Progress } from '@omnia/ui';

import {
  AssessmentExperience,
  isAssessmentMod,
} from '@/components/lms/assessment/AssessmentExperience';
import { LessonNav } from '@/components/lms/LessonNav';
import { LessonSidebar } from '@/components/lms/LessonSidebar';
import { LessonStatusBadge } from '@/components/lms/LessonStatusBadge';
import { MaterialExperience } from '@/components/lms/material/MaterialExperience';
import { useLearningEngine } from '@/components/lms/LearningEngineProvider';
import {
  estimateMinutes,
  lessonHref,
  resolveLessonUiStatus,
  type FlatLesson,
  type LessonActivity,
  type LessonSection,
} from '@/lib/lms/lesson-nav';

export type LessonWorkspaceProps = {
  omniaUserId: string;
  courseId: number;
  courseTitle: string;
  activity: LessonActivity;
  sectionId: number;
  sectionName: string;
  sectionSummary?: string | null;
  sections: LessonSection[];
  stateById: Record<number, number>;
  courseProgressPercent: number;
  prev: FlatLesson | null;
  next: FlatLesson | null;
  /** Sync já feito pelo SyncLearningState — evita double open. */
  moodleState?: number | null;
  activityTimeCompleted?: string | null;
  activityGrade?: {
    itemName: string;
    gradeFormatted: string | null;
    percentage: number | null;
  } | null;
};

/**
 * Orquestra Lesson Experience: lifecycle Learning Engine, UI, nav, conclusão local.
 * openLesson/closeLesson uma vez por montagem; progress via SyncLearningState separado.
 */
export function LessonWorkspace(props: LessonWorkspaceProps) {
  const engine = useLearningEngine();
  const router = useRouter();
  const openedRef = useRef(false);
  const [offline, setOffline] = useState(false);
  const [localCompleted, setLocalCompleted] = useState(false);
  const [studiedSeconds, setStudiedSeconds] = useState(0);
  const startedAt = useRef<number>(Date.now());

  const moodleDone = props.moodleState === 1 || props.moodleState === 2 || localCompleted;

  const status = resolveLessonUiStatus({
    offline,
    moodleState: props.moodleState,
    locallyCompleted: localCompleted,
  });

  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStudiedSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (engine.omniaUserId !== props.omniaUserId) return;
    if (openedRef.current) return;
    openedRef.current = true;
    engine.openLesson(props.courseId, props.activity.moodleActivityId, props.sectionId);
    if (props.sectionId) {
      engine.openModule(props.courseId, props.sectionId);
    }
    return () => {
      engine.closeLesson(props.courseId, props.activity.moodleActivityId);
      openedRef.current = false;
    };
  }, [engine, props.omniaUserId, props.courseId, props.activity.moodleActivityId, props.sectionId]);

  useEffect(() => {
    if (props.next) {
      router.prefetch(lessonHref(props.courseId, props.next.activityId));
    }
  }, [router, props.courseId, props.next]);

  const handleComplete = useCallback(() => {
    if (moodleDone) return;
    engine.completeLesson(props.courseId, props.activity.moodleActivityId, 1);
    if (props.next) {
      engine.updateContinue({
        courseId: props.courseId,
        activityId: props.next.activityId,
        sectionId: props.next.sectionId,
        source: 'progress',
      });
    }
    setLocalCompleted(true);
  }, [engine, moodleDone, props.courseId, props.activity.moodleActivityId, props.next]);

  const estimated = estimateMinutes(props.activity.modName);
  const studiedMin = Math.floor(studiedSeconds / 60);
  const studiedSec = studiedSeconds % 60;

  return (
    <div className="space-y-4" aria-label={`Aula do curso ${props.courseTitle}`}>
      {offline ? (
        <Alert variant="warning" title="Você está offline">
          A navegação local continua; sync com o Connector retoma quando houver conexão.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(16rem,18rem)_1fr]">
        <LessonSidebar
          courseId={props.courseId}
          currentActivityId={props.activity.moodleActivityId}
          sections={props.sections}
          stateById={{
            ...props.stateById,
            ...(localCompleted ? { [props.activity.moodleActivityId]: 1 } : {}),
          }}
          className="order-2 lg:order-1"
        />

        <div className="order-1 space-y-6 lg:order-2" id="aula-principal">
          <header className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Módulo: <span className="font-medium text-foreground">{props.sectionName}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-3xl font-bold tracking-tight">
                {props.activity.name}
              </h1>
              <LessonStatusBadge status={status} />
              {moodleDone ? (
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-lms-progress text-xs font-bold text-white"
                  aria-label="Aula concluída"
                  title="Concluída"
                >
                  ✓
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">Tipo: {props.activity.modName}</p>

            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <dt className="text-xs text-muted-foreground">Tempo estimado</dt>
                <dd className="text-sm font-medium">{estimated} min</dd>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <dt className="text-xs text-muted-foreground">Tempo estudado</dt>
                <dd className="text-sm font-medium" aria-live="polite">
                  {studiedMin}m {studiedSec.toString().padStart(2, '0')}s
                </dd>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <dt className="text-xs text-muted-foreground">Progresso do curso</dt>
                <dd className="mt-1">
                  <Progress value={props.courseProgressPercent} label="Curso" />
                </dd>
              </div>
            </dl>
          </header>

          {isAssessmentMod(props.activity.modName) ? (
            <AssessmentExperience
              courseId={props.courseId}
              activity={props.activity}
              sectionId={props.sectionId}
              sectionSummary={props.sectionSummary}
              progressState={props.moodleState ?? 0}
              timeCompleted={props.activityTimeCompleted}
              grade={props.activityGrade}
              prev={props.prev}
              next={props.next}
            />
          ) : (
            <MaterialExperience
              courseId={props.courseId}
              activity={props.activity}
              sectionId={props.sectionId}
              sectionSummary={props.sectionSummary}
              nextActivityId={props.next?.activityId ?? null}
            />
          )}

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-lms-card">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Conclusão da aula</p>
              <p className="text-xs text-muted-foreground">
                {moodleDone
                  ? 'Aula marcada como concluída. Continue Learning e Timeline já foram atualizados.'
                  : 'Marcar conclusão na experiência Omnia (evento local via Learning Engine). Sync write Moodle fica para sprint futura.'}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleComplete}
              disabled={moodleDone}
              aria-pressed={moodleDone}
            >
              {moodleDone ? 'Aula concluída' : 'Marcar como concluída'}
            </Button>
            {props.next && moodleDone ? (
              <Button asChild variant="default">
                <Link href={lessonHref(props.courseId, props.next.activityId)} prefetch>
                  Ir para próxima aula
                </Link>
              </Button>
            ) : null}
          </div>

          {props.next ? (
            <aside
              className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4"
              aria-label="Próxima aula sugerida"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Próxima aula
              </p>
              <p className="mt-1 font-heading text-lg font-semibold text-foreground">
                {props.next.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {props.next.sectionName} · {props.next.modName}
              </p>
              <Button asChild className="mt-3" size="sm">
                <Link href={lessonHref(props.courseId, props.next.activityId)} prefetch>
                  Abrir próxima aula
                </Link>
              </Button>
            </aside>
          ) : null}

          <LessonNav
            courseId={props.courseId}
            sectionId={props.sectionId}
            prev={props.prev}
            next={props.next}
            nextHighlighted={!moodleDone}
          />
        </div>
      </div>
    </div>
  );
}
