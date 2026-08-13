import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';
import { OnboardingWizard } from '@/components/academic/OnboardingWizard';

export const dynamic = 'force-dynamic';

export default async function AlunoOnboardingPage() {
  const user = await requirePortalSession('/aluno/onboarding');
  const res = await fetchAcademic<{
    onboarding?: {
      status?: string;
      currentStep?: string;
      schoolName?: string | null;
      consentVersion?: string;
      academicAllowed?: boolean;
      result?: { summary?: string; nextAction?: string } | null;
    };
  }>('ils/onboarding', { user });
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Boas-vindas</h1>
      <OnboardingWizard initial={res.ok ? (res.data.onboarding ?? {}) : {}} />
    </div>
  );
}
