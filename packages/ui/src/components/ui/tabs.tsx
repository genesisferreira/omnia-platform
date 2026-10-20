'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';

export type TabItem = {
  id: string;
  label: string;
  panel: React.ReactNode;
};

export type TabsProps = {
  items: TabItem[];
  defaultTab?: string;
  className?: string;
};

export function Tabs({ items, defaultTab, className }: TabsProps) {
  const [active, setActive] = React.useState(defaultTab || items[0]?.id || '');
  const current = items.find((i) => i.id === active) || items[0];

  return (
    <div className={cn('w-full', className)}>
      <div role="tablist" aria-label="Seções" className="flex gap-1 border-b border-border">
        {items.map((item) => {
          const selected = item.id === current?.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`tab-${item.id}`}
              aria-controls={`panel-${item.id}`}
              className={cn(
                'rounded-t-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setActive(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {current ? (
        <div
          role="tabpanel"
          id={`panel-${current.id}`}
          aria-labelledby={`tab-${current.id}`}
          className="animate-lms-fade-in py-4"
        >
          {current.panel}
        </div>
      ) : null}
    </div>
  );
}
