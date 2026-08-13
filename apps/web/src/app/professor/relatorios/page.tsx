import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@omnia/ui';

import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function ProfessorRelatoriosPage() {
  const user = await requirePortalSession('/professor/relatorios');
  const res = await fetchAcademic<{
    dashboard?: {
      activeStudents?: number;
      averageProgress?: number;
      pendingGrading?: number;
      struggling?: number;
    };
  }>('teaching/dashboard', { user });
  const d = res.ok ? res.data.dashboard : null;
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Relatórios</h1>
      <p className="text-sm text-muted-foreground">
        Indicadores operacionais da turma. Sem inferência clínica.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Operação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Alunos ativos: {d?.activeStudents ?? 0}</p>
            <p>Progresso médio: {d?.averageProgress ?? 0}%</p>
            <p>Correções pendentes: {d?.pendingGrading ?? 0}</p>
            <p>Alunos com dificuldade: {d?.struggling ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link className="block underline" href="/professor/notas">
              Corrigir avaliações
            </Link>
            <Link className="block underline" href="/professor/alunos">
              Ver alunos
            </Link>
            <Link className="block underline" href="/ia">
              IA pedagógica
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
