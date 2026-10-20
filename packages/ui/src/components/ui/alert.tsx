import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../lib/utils';

const alertVariants = cva('relative w-full rounded-lg border px-4 py-3 text-sm', {
  variants: {
    variant: {
      default: 'border-border bg-card text-card-foreground',
      destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
      warning: 'border-lms-warning/40 bg-lms-warning/10 text-foreground',
      success: 'border-lms-success/40 bg-lms-success/10 text-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

export type AlertProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    title?: string;
  };

export function Alert({ className, variant, title, children, ...props }: AlertProps) {
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      {title ? <p className="mb-1 font-heading font-semibold">{title}</p> : null}
      <div className="text-sm opacity-90">{children}</div>
    </div>
  );
}
