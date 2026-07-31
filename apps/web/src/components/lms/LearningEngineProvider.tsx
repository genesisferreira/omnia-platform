'use client';

import {
  createBrowserPersistence,
  createLearningEngine,
  type LearningEngine,
} from '@omnia/learning-engine';
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

const LearningEngineContext = createContext<LearningEngine | null>(null);

export function LearningEngineProvider(props: {
  omniaUserId: string;
  actorRole?: string;
  children: ReactNode;
}) {
  const engine = useMemo(
    () =>
      createLearningEngine({
        omniaUserId: props.omniaUserId,
        actorRole: props.actorRole ?? 'student',
        origin: 'omnia.web',
        persistence: createBrowserPersistence(),
      }),
    [props.omniaUserId, props.actorRole],
  );

  return (
    <LearningEngineContext.Provider value={engine}>{props.children}</LearningEngineContext.Provider>
  );
}

export function useLearningEngine(): LearningEngine {
  const engine = useContext(LearningEngineContext);
  if (!engine) {
    throw new Error('useLearningEngine must be used within LearningEngineProvider');
  }
  return engine;
}

export function useLearningEngineOptional(): LearningEngine | null {
  return useContext(LearningEngineContext);
}
