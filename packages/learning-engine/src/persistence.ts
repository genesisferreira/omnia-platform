import type { LearningPersistence } from './types';

/** Persistência em memória (SSR, Node, testes). */
export function createMemoryPersistence(seed: Record<string, string> = {}): LearningPersistence {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    getItem(key) {
      return map.get(key) ?? null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

/** Adapter browser — Learning Engine NÃO importa localStorage diretamente. */
export function createBrowserPersistence(): LearningPersistence {
  return {
    getItem(key) {
      if (typeof window === 'undefined') return null;
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // ignore quota / private mode
      }
    },
    removeItem(key) {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}
