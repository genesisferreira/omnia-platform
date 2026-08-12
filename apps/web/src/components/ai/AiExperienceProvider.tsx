'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

import type { AiSessionSummary, AiTurn, AskAiContext, UserAiContext } from '@/components/ai/types';
import { contextLabel, resolvePageAiContext } from '@/lib/ai/page-context';

type AiExperienceValue = {
  authenticated: boolean | null;
  user: UserAiContext | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  pageContext: AskAiContext;
  contextLabel: string;
  sessionId: string | number | null;
  setSessionId: (id: string | number | null) => void;
  turns: AiTurn[];
  setTurns: (turns: AiTurn[]) => void;
  assistantId: string;
  setAssistantId: (id: string) => void;
  sessions: AiSessionSummary[];
  refreshSessions: () => Promise<void>;
  openSession: (id: string | number) => Promise<void>;
  newConversation: () => void;
};

const AiExperienceContext = createContext<AiExperienceValue | null>(null);

export function useAiExperience(): AiExperienceValue {
  const ctx = useContext(AiExperienceContext);
  if (!ctx) {
    throw new Error('useAiExperience must be used within AiExperienceProvider');
  }
  return ctx;
}

export function useOptionalAiExperience(): AiExperienceValue | null {
  return useContext(AiExperienceContext);
}

export function AiExperienceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/';
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<UserAiContext | null>(null);
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | number | null>(null);
  const [turns, setTurns] = useState<AiTurn[]>([]);
  const [assistantId, setAssistantId] = useState('auto');
  const [sessions, setSessions] = useState<AiSessionSummary[]>([]);

  const pageContext = useMemo(() => resolvePageAiContext(pathname), [pathname]);
  const label = useMemo(() => contextLabel(pageContext), [pageContext]);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({
      route: pathname,
      area: pageContext.portalArea || 'portal',
    });
    fetch(`/api/ai/context?${qs}`)
      .then(async (r) => {
        if (r.status === 401) {
          if (!cancelled) {
            setAuthenticated(false);
            setUser(null);
          }
          return null;
        }
        const json = await r.json();
        if (!cancelled && json?.ok && json.data) {
          setAuthenticated(true);
          setUser(json.data as UserAiContext);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthenticated(false);
          setUser(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, pageContext.portalArea]);

  const refreshSessions = useCallback(async () => {
    if (!authenticated) return;
    try {
      const res = await fetch('/api/ai/sessions?limit=30');
      const json = await res.json();
      const list = (json?.data?.sessions || []) as AiSessionSummary[];
      if (res.ok && Array.isArray(list)) setSessions(list);
    } catch {
      /* ignore */
    }
  }, [authenticated]);

  useEffect(() => {
    if (authenticated) void refreshSessions();
  }, [authenticated, refreshSessions]);

  const openSession = useCallback(async (id: string | number) => {
    const res = await fetch(`/api/ai/sessions/${encodeURIComponent(String(id))}`);
    const json = await res.json();
    if (!res.ok || !json?.ok || !json.data) return;
    const data = json.data as {
      id: string | number;
      question?: string;
      answerText?: string | null;
      turns?: unknown;
    };
    setSessionId(data.id);
    const rawTurns = Array.isArray(data.turns) ? data.turns : null;
    if (rawTurns && rawTurns.length) {
      const mapped: AiTurn[] = [];
      for (const item of rawTurns) {
        if (!item || typeof item !== 'object') continue;
        const row = item as Record<string, unknown>;
        const q = String(row.question || row.q || '');
        const text = String(row.answer || row.answerText || row.text || '');
        if (!q && !text) continue;
        mapped.push({
          question: q || '(pergunta)',
          answer: {
            sessionId: data.id,
            text: text || String(data.answerText || ''),
            sources: [],
            confidence: 0,
            tookMs: 0,
            model: '',
            provider: '',
            tokens: { prompt: 0, completion: 0, total: 0 },
            status: 'ok',
          },
        });
      }
      setTurns(mapped.length ? mapped : []);
    } else if (data.question) {
      setTurns([
        {
          question: data.question,
          answer: {
            sessionId: data.id,
            text: String(data.answerText || ''),
            sources: [],
            confidence: 0,
            tookMs: 0,
            model: '',
            provider: '',
            tokens: { prompt: 0, completion: 0, total: 0 },
            status: 'ok',
          },
        },
      ]);
    }
    setOpen(true);
  }, []);

  const newConversation = useCallback(() => {
    setSessionId(null);
    setTurns([]);
    setAssistantId('auto');
  }, []);

  const value = useMemo<AiExperienceValue>(
    () => ({
      authenticated,
      user,
      open,
      setOpen,
      toggle: () => setOpen((v) => !v),
      pageContext,
      contextLabel: label,
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
    }),
    [
      authenticated,
      user,
      open,
      pageContext,
      label,
      sessionId,
      turns,
      assistantId,
      sessions,
      refreshSessions,
      openSession,
      newConversation,
    ],
  );

  return <AiExperienceContext.Provider value={value}>{children}</AiExperienceContext.Provider>;
}
