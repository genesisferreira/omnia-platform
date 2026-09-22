import { Skeleton } from '@omnia/ui';

export function MaterialSkeleton(props: { compact?: boolean }) {
  if (props.compact) {
    return <Skeleton className="h-24 w-full" aria-hidden />;
  }
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando material">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
