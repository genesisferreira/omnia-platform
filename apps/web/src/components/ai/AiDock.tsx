'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import { AiChatWorkspace } from '@/components/ai/AiChatWorkspace';
import { useAiExperience } from '@/components/ai/AiExperienceProvider';

/**
 * Global floating AI Dock — authenticated Command Center session OR public Concierge.
 */
export function AiDock() {
  const {
    authenticated,
    user,
    open,
    setOpen,
    toggle,
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

  const isPublic = authenticated === false;
  const ready = authenticated === true || authenticated === false;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (open && authenticated) void refreshSessions();
  }, [open, refreshSessions, authenticated]);

  // Reset dock conversation when switching auth boundary (anon ↔ user).
  useEffect(() => {
    setSessionId(null);
    setTurns([]);
    setAssistantId(isPublic ? 'concierge' : 'auto');
  }, [isPublic, setSessionId, setTurns, setAssistantId]);

  if (!ready) return null;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="omnia-ai-dock-panel"
        aria-label={open ? 'Fechar Omnia AI' : 'Abrir Omnia AI'}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-cyan-300 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/40 transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 md:bottom-6 md:right-6"
      >
        <span className="text-sm font-semibold tracking-tight">AI</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:bg-transparent"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id="omnia-ai-dock-panel"
        role="dialog"
        aria-modal="true"
        aria-label={isPublic ? 'Omnia AI Concierge' : 'Omnia AI Dock'}
        className={`fixed z-50 flex flex-col border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl transition-transform duration-200 ease-out ${
          open
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0 md:translate-x-4 md:translate-y-0'
        } inset-x-0 bottom-0 h-[min(92vh,720px)] rounded-t-2xl md:inset-y-0 md:right-0 md:h-full md:w-[min(100vw,420px)] md:rounded-none md:border-l`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-400/90">Omnia AI</p>
            <p className="truncate text-sm font-medium text-zinc-50">
              {isPublic ? 'Concierge' : user?.displayName || 'Usuário'}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {isPublic ? 'Visitante' : user?.role} · {contextLabel}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isPublic ? (
              <Link
                href="/login?next=/ia"
                className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-cyan-500/50"
                onClick={() => setOpen(false)}
              >
                Entrar
              </Link>
            ) : (
              <Link
                href="/ia"
                className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-cyan-500/50"
                onClick={() => setOpen(false)}
              >
                Central
              </Link>
            )}
            <button
              type="button"
              className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
              onClick={() => setOpen(false)}
              aria-label="Fechar painel"
            >
              Esc
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {!isPublic ? (
            <nav
              aria-label="Conversas recentes"
              className="hidden w-36 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950/80 p-2 sm:flex"
            >
              <button
                type="button"
                onClick={newConversation}
                className="mb-2 rounded-md bg-cyan-600/90 px-2 py-1.5 text-left text-xs font-medium text-white"
              >
                Nova conversa
              </button>
              <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                {sessions.slice(0, 12).map((s) => (
                  <li key={String(s.id)}>
                    <button
                      type="button"
                      onClick={() => void openSession(s.id)}
                      className={`w-full rounded px-2 py-1.5 text-left text-[11px] leading-snug ${
                        String(sessionId) === String(s.id)
                          ? 'bg-zinc-800 text-cyan-200'
                          : 'text-zinc-400 hover:bg-zinc-900'
                      }`}
                    >
                      {(s.question || 'Conversa').slice(0, 48)}
                      {(s.question || '').length > 48 ? '…' : ''}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <div className="min-w-0 flex-1">
            <AiChatWorkspace
              variant="dock"
              mode={isPublic ? 'public' : 'authenticated'}
              context={pageContext}
              sessionId={sessionId}
              turns={turns}
              assistantId={isPublic ? 'concierge' : assistantId}
              onSessionIdChange={setSessionId}
              onTurnsChange={setTurns}
              onAssistantIdChange={setAssistantId}
              className="h-full border-0"
            />
          </div>
        </div>
      </aside>
    </>
  );
}
