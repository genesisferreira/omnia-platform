'use client';

import { LmsShell } from '@/components/lms/LmsShell';
import { LearningEngineProvider } from '@/components/lms/LearningEngineProvider';

export function LmsAppShell(props: {
  omniaUserId: string;
  userName: string;
  actorRole?: string;
  children: React.ReactNode;
}) {
  return (
    <LearningEngineProvider omniaUserId={props.omniaUserId} actorRole={props.actorRole}>
      <LmsShell userName={props.userName}>{props.children}</LmsShell>
    </LearningEngineProvider>
  );
}
