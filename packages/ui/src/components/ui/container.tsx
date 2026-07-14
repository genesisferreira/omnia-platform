import * as React from 'react';

import { cn } from '../../lib/utils';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'default' | 'narrow' | 'wide';
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        {
          'max-w-5xl': size === 'narrow',
          'max-w-7xl': size === 'default',
          'max-w-[90rem]': size === 'wide',
        },
        className,
      )}
      {...props}
    />
  ),
);
Container.displayName = 'Container';

export { Container };
