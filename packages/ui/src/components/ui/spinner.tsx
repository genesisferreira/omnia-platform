import * as React from 'react';

import { cn } from '../../lib/utils';

export type SpinnerProps = React.HTMLAttributes<HTMLDivElement> & {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClass = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-2', lg: 'h-12 w-12 border-[3px]' };

export function Spinner({ label = 'Carregando', size = 'md', className, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('inline-flex flex-col items-center gap-2', className)}
      {...props}
    >
      <div
        className={cn('animate-spin rounded-full border-muted border-t-primary', sizeClass[size])}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
