import { Card, CardContent, CardHeader, CardTitle } from '@omnia/ui';

import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function AlunoInteligenciaPage() {
  const user = await requirePortalSession('/aluno/inteligencia');
  const res = await fetchAcademic<{
    profile?: {
      result?: { summary?: string; nextAction?: string };
      academic?: { progressPercent?: number };
      competencies?: Array<{ key: string; score: number }>;
      learning?: { recommendations?: string[] };
      imt?: { status?: string; value?: number | null };
    };
  }>('ils/student-360', { user });
  const p = res.ok ? res.data.profile : null;
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Seu acompanhamento</h1>
      <p className="max-w-3xl text-sm leading-relaxed">
        {p?.result?.summary || 'Complete o onboarding para ver um resumo personalizado.'}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Progresso nos cursos</CardTitle>
          </CardHeader>
          <CardContent>{p?.academic?.progressPercent ?? 0}%</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Próximo passo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{p?.result?.nextAction || '—'}</CardContent>
        </Card>
      </div>
      <ul className="list-disc pl-5 text-sm">
        {(p?.learning?.recommendations || []).map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
