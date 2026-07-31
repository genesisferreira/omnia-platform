'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import {
  createAssessmentEngine,
  createStubAssessmentSecurityPorts,
  resolveAssessment,
  type AssessmentDescriptor,
  type AssessmentEngine,
  type AssessmentSecurityPorts,
  type ResolvedAssessment,
} from '@omnia/assessment-engine';

import { useLearningEngine } from '@/components/lms/LearningEngineProvider';

type AssessmentProviderValue = {
  engine: AssessmentEngine;
  resolve: (descriptor: AssessmentDescriptor) => ResolvedAssessment;
  security: AssessmentSecurityPorts;
};

const Ctx = createContext<AssessmentProviderValue | null>(null);

export function AssessmentProvider(props: {
  children: ReactNode;
  security?: AssessmentSecurityPorts;
}) {
  const learning = useLearningEngine();
  const security = props.security ?? createStubAssessmentSecurityPorts();

  const value = useMemo<AssessmentProviderValue>(() => {
    const engine = createAssessmentEngine({
      omniaUserId: learning.omniaUserId,
      security,
      sink: {
        emitAssessmentEvent: (type, payload) => learning.emitAssessmentEvent(type, payload),
        updateContinue: (pointer) =>
          learning.updateContinue({
            courseId: pointer.courseId,
            activityId: pointer.activityId,
            sectionId: pointer.sectionId,
            source: pointer.source ?? 'last_seen',
          }),
      },
    });
    return {
      engine,
      security,
      resolve: (descriptor) => resolveAssessment(descriptor),
    };
  }, [learning, security]);

  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

export function useAssessmentProvider(): AssessmentProviderValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAssessmentProvider must be used within AssessmentProvider');
  return ctx;
}
