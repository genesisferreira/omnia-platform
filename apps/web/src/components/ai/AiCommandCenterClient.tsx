'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import { AiChatWorkspace } from '@/components/ai/AiChatWorkspace';
import { useAiExperience } from '@/components/ai/AiExperienceProvider';
import type { UserAiContext } from '@/components/ai/types';

export function AiCommandCenterClient({ user }: { user: UserAiContext }) {
  const {
    pageContext,
    contextLabel,
    sessionId,
    setSessionId,
    turns,
    setTurns,
    assistantId,
    setAssistantId,
    sessions,
    refreshSessions,
    openSession,
    newConversation,
  } = useAiExperience();

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 md:px-6 lg:flex-row lg:gap-6">
        <aside className="w-full shrink-0 space-y-4 lg:w-72">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-400">Omnia AI</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">Central de Inteligência</h1>
            <p className="mt-2 text-sm text-zinc-400">
              {user.displayName} · <span className="text-zinc-300">{user.role}</span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">{contextLabel}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={newConversation}
                className="rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-500"
              >
                Nova conversa
              </button>
              <Link
                href="/cursos"
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
              >
                Ir aos cursos
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Conversas recentes
            </h2>
            <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <li className="px-1 py-2 text-xs text-zinc-500">Nenhuma conversa ainda.</li>
              ) : (
                sessions.map((s) => (
                  <li key={String(s.id)}>
                    <button
                      type="button"
                      onClick={() => void openSession(s.id)}
                      className={`w-full rounded-md px-2 py-2 text-left text-xs leading-snug ${
                        String(sessionId) === String(s.id)
                          ? 'bg-zinc-800 text-cyan-200'
                          : 'text-zinc-400 hover:bg-zinc-900'
                      }`}
                    >
                      <span className="line-clamp-2">{s.question || 'Conversa'}</span>
                      {s.updatedAt ? (
                        <span className="mt-1 block text-[10px] text-zinc-600">
                          {new Date(s.updatedAt).toLocaleString('pt-BR')}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>

        <section className="min-h-[70vh] flex-1">
          <AiChatWorkspace
            variant="command"
            context={{ ...pageContext, language: 'pt-BR' }}
            sessionId={sessionId}
            turns={turns}
            assistantId={assistantId}
            onSessionIdChange={setSessionId}
            onTurnsChange={setTurns}
            onAssistantIdChange={setAssistantId}
            className="min-h-[70vh]"
          />
        </section>
      </div>
    </div>
  );
}
