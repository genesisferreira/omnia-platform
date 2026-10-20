'use client';

import { AiChatWorkspace } from '@/components/ai/AiChatWorkspace';
import type { AskAiContext } from '@/components/ai/types';

export type { AskAiContext } from '@/components/ai/types';

/**
 * Course/lesson embedded chat — same backend as Command Center / Dock.
 */
export function AskAiPanel({ context }: { context: AskAiContext }) {
  return (
    <div className="my-6">
      <details className="group">
        <summary className="cursor-pointer list-none">
          <span className="inline-flex rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90">
            Perguntar à IA
          </span>
        </summary>
        <div className="mt-4">
          <AiChatWorkspace variant="embedded" context={context} />
        </div>
      </details>
    </div>
  );
}
