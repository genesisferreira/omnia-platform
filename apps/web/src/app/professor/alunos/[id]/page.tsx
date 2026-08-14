import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@omnia/ui';

import { InterventionForm } from '@/components/academic/IlsTeacherForms';
import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

type Profile = {
  identity?: { studentId?: number; schoolName?: string | null };
  academic?: { progressPercent?: number; completedLessons?: number; certificates?: number };
  competencies?: Array<{ key: string; score: number; evidenceCount: number }>;
  evolution?: Array<{ key: string; from: number | null; to: number }>;
  baseline?: { goals?: string[]; initialOverall?: number | null };
  learning?: {
    recommendations?: string[];
    interventionsList?: Array<{ action: string; reason: string }>;
  };
  attention?: Array<{ evidence: string }>;
  imt?: { status?: string; value?: number | null };
  result?: { summary?: string };
};

export default async function ProfessorStudent360Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePortalSession('/professor/alunos');
  const { id } = await params;
  const res = await fetchAcademic<{ profile?: Profile }>(`ils/teaching/student/${id}`, { user });
  const p = res.ok ? res.data.profile : null;
  if (!p) {
    return (
      <p className="text-sm text-muted-foreground">Aluno não encontrado ou sem autorização.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/professor/alunos" className="text-sm underline">
          Voltar aos alunos
        </Link>
        <h1 className="font-heading mt-2 text-2xl font-semibold">
          Aluno #{p.identity?.studentId} · {p.identity?.schoolName}
        </h1>
      </div>
      {p.result?.summary ? (
        <p className="max-w-3xl text-sm leading-relaxed">{p.result.summary}</p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Progresso</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {p.academic?.progressPercent ?? 0}%
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Aulas concluídas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {p.academic?.completedLessons ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">IMT</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {p.imt?.status === 'ok' ? `${p.imt.value}` : 'Evidência insuficiente'}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Competências</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(p.competencies || []).map((c) => (
            <div key={c.key} className="flex justify-between border-b border-border py-1">
              <span>{c.key}</span>
              <span>
                {c.score} · {c.evidenceCount} evidências
              </span>
            </div>
          ))}
          {!p.competencies?.length ? (
            <p className="text-muted-foreground">Sem histórico ainda.</p>
          ) : null}
        </CardContent>
      </Card>
      {(p.attention || []).map((s) => (
        <p key={s.evidence} className="rounded-md border border-border px-3 py-2 text-sm">
          {s.evidence}
        </p>
      ))}
      <Card>
        <CardHeader>
          <CardTitle>Exercícios / reforços sugeridos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {(p.learning?.interventionsList || []).map((item, idx) => (
            <div key={`${item.action}-${idx}`} className="rounded-md border border-border px-3 py-2">
              <p className="font-medium">{item.action}</p>
              <p className="text-muted-foreground">
                Por quê: {item.reason || 'reforço pedagógico baseado no perfil do aluno'}
              </p>
            </div>
          ))}
          {!p.learning?.interventionsList?.length ? (
            <p className="text-muted-foreground">
              Nenhum exercício personalizado sugerido ainda. Use a intervenção abaixo quando
              precisar registrar um reforço.
            </p>
          ) : null}
          {(p.learning?.recommendations || []).length ? (
            <ul className="list-disc pl-5 text-muted-foreground">
              {p.learning?.recommendations?.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
      <InterventionForm studentId={Number(id)} />
      <Button asChild variant="outline">
        <Link href="/professor/notas">Ver tentativas</Link>
      </Button>
    </div>
  );
}
