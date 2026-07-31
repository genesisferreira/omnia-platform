'use client';

import Link from 'next/link';
import { cn } from '@omnia/ui';

import {
  lessonHref,
  type LessonSection,
} from '@/lib/lms/lesson-nav';

export type LessonSidebarProps = {
  courseId: number;
  currentActivityId: number;
  sections: LessonSection[];
  stateById: Record<number, number>;
  className?: string;
};

function isDone(state: number | undefined): boolean {
  return state === 1 || state === 2;
}

/**
 * Sidebar L2 — módulos e aulas do curso (Lesson Experience).
 * Acessível: nav landmark, current page, teclado via links nativos.
 */
export function LessonSidebar(props: LessonSidebarProps) {
  return (
    <nav
      aria-label="Módulos e aulas do curso"
      className={cn(
        'rounded-lg border border-border bg-card p-3 shadow-lms-card lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto',
        props.className,
      )}
    >
      <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Conteúdo do curso
      </p>
      <ol className="space-y-4">
        {props.sections.map((section) => {
          if (section.visible === false) return null;
          const visible = section.activities.filter((a) => a.visible);
          if (visible.length === 0) return null;
          return (
            <li key={section.sectionId} id={`lesson-mod-${section.sectionId}`}>
              <p className="mb-1.5 px-2 text-sm font-semibold text-foreground">{section.name}</p>
              <ul className="space-y-0.5" role="list">
                {visible.map((activity) => {
                  const active = activity.moodleActivityId === props.currentActivityId;
                  const done = isDone(props.stateById[activity.moodleActivityId]);
                  return (
                    <li key={activity.moodleActivityId}>
                      <Link
                        href={lessonHref(props.courseId, activity.moodleActivityId)}
                        prefetch
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-start gap-2 rounded-md px-2 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          active
                            ? 'bg-primary/10 font-medium text-primary'
                            : 'text-foreground hover:bg-muted/70',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                            done
                              ? 'bg-lms-progress'
                              : active
                                ? 'bg-primary'
                                : 'bg-muted-foreground/40',
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block leading-snug">{activity.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {activity.modName}
                            {done ? ' · Concluída' : ''}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
