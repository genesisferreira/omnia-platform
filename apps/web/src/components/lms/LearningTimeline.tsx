'use client';

import Link from 'next/link';
import { useMemo, useSyncExternalStore } from 'react';

import { useLearningEngine } from '@/components/lms/LearningEngineProvider';

export function LearningTimeline() {
  const engine = useLearningEngine();
  const version = useSyncExternalStore(
    (onStoreChange) => engine.subscribe(() => onStoreChange()),
    () => engine.getSnapshot().updatedAt,
    () => engine.getSnapshot().updatedAt,
  );

  const groups = useMemo(() => {
    void version;
    return engine.getTimelineGrouped();
  }, [engine, version]);

  if (groups.length === 0 || groups.every((g) => g.items.length === 0)) {
    return (
      <p className="text-sm text-muted-foreground">
        Sua linha do tempo aparecerá aqui conforme você estudar (aulas, materiais e conclusões).
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.day} aria-label={group.label}>
          <h3 className="mb-2 font-heading text-sm font-semibold text-foreground">{group.label}</h3>
          <ol className="relative space-y-3 border-l border-border pl-4">
            {group.items.slice(0, 12).map((item) => (
              <li key={item.id} className="relative">
                <span
                  className="absolute -left-[1.28rem] top-1.5 h-2.5 w-2.5 rounded-full bg-lms-progress"
                  aria-hidden
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <time className="text-xs text-muted-foreground" dateTime={item.timestamp}>
                    {new Date(item.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
                {item.courseId ? (
                  <Link
                    href={
                      item.activityId
                        ? `/lms/cursos/${item.courseId}/atividades/${item.activityId}`
                        : `/lms/cursos/${item.courseId}`
                    }
                    className="text-xs text-primary hover:underline"
                  >
                    Abrir contexto
                  </Link>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
