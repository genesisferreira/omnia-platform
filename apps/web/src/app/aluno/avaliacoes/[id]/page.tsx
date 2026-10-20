import { notFound } from 'next/navigation';

import { AssessmentRunner } from '@/components/academic/AssessmentRunner';
import { fetchAcademic } from '@/lib/academic/client';
import { requirePortalSession } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function AlunoAvaliacaoPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requirePortalSession(`/aluno/avaliacoes/${id}`);
  const res = await fetchAcademic<{
    assessment?: { id: number; title: string; instructions?: string | null };
    questions?: Array<{
      id: number;
      type: string;
      points: number;
      prompt?: string;
      options?: { choices?: Array<{ id: string; label: string }> };
    }>;
  }>(`assessments/${id}`, { user });
  if (!res.ok || !res.data.assessment) notFound();
  return (
    <AssessmentRunner
      assessmentId={res.data.assessment.id}
      title={res.data.assessment.title}
      instructions={res.data.assessment.instructions}
      questions={res.data.questions ?? []}
    />
  );
}
