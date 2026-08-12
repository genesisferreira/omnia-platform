import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AiCommandCenterClient } from '@/components/ai/AiCommandCenterClient';
import { getSessionToken } from '@/lib/auth/session';
import { fetchMe } from '@/lib/auth/payload-client';
import { buildUserAiContext } from '@/lib/ai/user-ai-context';

export const metadata: Metadata = {
  title: 'Omnia AI — Central de Inteligência',
  description: 'Command Center de assistentes Omnia com contexto e autorização por sessão.',
  robots: { index: false, follow: false },
};

export default async function IaPage() {
  const token = await getSessionToken();
  if (!token) redirect('/login?next=/ia');
  const me = await fetchMe(token);
  if (!me.ok) redirect('/login?next=/ia');

  const user = buildUserAiContext(me.data, {
    currentRoute: '/ia',
    currentPortalArea: 'ai_command_center',
  });

  return <AiCommandCenterClient user={user} />;
}
