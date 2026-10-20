import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@omnia/ui';

import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

export default async function ProfessorDashboardPage() {
  const user = await requirePortalSession('/professor');
  const res = await fetchAcademic<{
    dashboard?: {
      activeStudents?: number;
      averageProgress?: number;
      pendingGrading?: number;
      struggling?: number;
      classes?: Array<{ id: number; name: string }>;
    };
  }>('teaching/dashboard', { user });
  const d = res.ok ? res.data.dashboard : null;
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Painel do professor</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Alunos ativos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{d?.activeStudents ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Progresso médio</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{d?.averageProgress ?? 0}%</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Correções pendentes</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{d?.pendingGrading ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Alunos com dificuldade</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{d?.struggling ?? 0}</CardContent>
        </Card>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link className="underline" href="/professor/turmas">
          Turmas
        </Link>
        <Link className="underline" href="/professor/avaliacoes">
          Criar avaliação
        </Link>
        <Link className="underline" href="/professor/notas">
          Corrigir
        </Link>
        <Link className="underline" href="/professor/inteligencia">
          Inteligência da turma
        </Link>
      </div>
    </div>
  );
}
