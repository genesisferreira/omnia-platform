import { Skeleton } from '@omnia/ui';

/** Skeleton da Lesson Page (loading.tsx / estados). */
export function LessonSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando aula">
      <Skeleton className="h-4 w-64" />
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="hidden space-y-3 lg:block">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-40" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
