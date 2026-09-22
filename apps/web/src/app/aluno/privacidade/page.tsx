import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function AlunoPrivacidadePage() {
  await requirePortalSession('/aluno/privacidade');
  const ctx = await fetchAcademic<{ context?: { schoolName?: string } }>('ils/context');
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Privacidade educacional</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {ctx.ok ? ctx.data.context?.schoolName : 'Omnia LMS'} trata dados de onboarding apenas para
        personalizar o aprendizado. Não coletamos diagnóstico psicológico, saúde mental ou
        personalidade clínica.
      </p>
    </div>
  );
}
