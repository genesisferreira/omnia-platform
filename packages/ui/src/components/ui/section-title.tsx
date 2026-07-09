import * as React from 'react';

import { cn } from '../../lib/utils';

export interface SectionTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
}

function SectionTitle({
  title,
  subtitle,
  align = 'left',
  className,
  ...props
}: SectionTitleProps) {
  return (
    <div
      className={cn('space-y-2', align === 'center' && 'text-center', className)}
      {...props}
    >
      <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {subtitle ? <p className="text-lg text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export { SectionTitle };
