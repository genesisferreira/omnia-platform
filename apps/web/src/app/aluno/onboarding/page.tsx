import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';
import { OnboardingChat } from '@/components/academic/OnboardingChat';

export const dynamic = 'force-dynamic';

export default async function AlunoOnboardingPage() {
  const user = await requirePortalSession('/aluno/onboarding');
  const res = await fetchAcademic<{
    onboarding?: {
      status?: string;
      currentStep?: string;
      schoolName?: string | null;
      schoolKey?: string | null;
      consentVersion?: string;
      academicAllowed?: boolean;
      result?: { summary?: string; nextAction?: string } | null;
    };
  }>('ils/onboarding', { user });
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Boas-vindas</h1>
      <OnboardingChat initial={res.ok ? (res.data.onboarding ?? {}) : {}} />
    </div>
  );
}
