import * as React from 'react';

import { cn } from '../../lib/utils';

export type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
};

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-lms-surface px-6 py-12 text-center',
        className,
      )}
      role="status"
      {...props}
    >
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
      {description ? <p className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
