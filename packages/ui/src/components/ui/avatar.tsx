import * as React from 'react';

import { cn } from '../../lib/utils';

export type AvatarProps = React.HTMLAttributes<HTMLDivElement> & {
  name?: string | null;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
};

function initials(name?: string | null): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
}

const sizeClass = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' };

export function Avatar({ name, src, size = 'md', className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-heading font-semibold text-secondary-foreground',
        sizeClass[size],
        className,
      )}
      aria-hidden={src ? undefined : true}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}
