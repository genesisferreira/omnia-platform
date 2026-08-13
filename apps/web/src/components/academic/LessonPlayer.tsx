'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@omnia/ui';

import { TutorPanel } from '@/components/ai/TutorPanel';

type Asset = {
  id: number;
  title?: string | null;
  assetType?: string | null;
  media?: { url?: string | null; mimeType?: string | null; filename?: string | null } | null;
};

export function LessonPlayer(props: {
  courseSlug: string;
  lesson: {
    id: number;
    title: string;
    type?: string | null;
    summary?: string | null;
    completed?: boolean;
  };
  assets: Asset[];
  prev?: { slug: string; title: string } | null;
  next?: { slug: string; title: string } | null;
  tutorContext: {
    courseId: number;
    courseTitle: string;
    lessonId: number;
    lessonTitle: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(!!props.lesson.completed);

  async function complete() {
    if (busy) return;
    setBusy(true);
    await fetch(`/api/academic/lessons/${props.lesson.id}/complete`, { method: 'POST' });
    setDone(true);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">{props.lesson.title}</h1>
      {props.lesson.summary ? (
        <p className="text-sm text-muted-foreground">{props.lesson.summary}</p>
      ) : null}
      <div className="space-y-4">
        {props.assets.map((asset) => (
          <AssetView key={asset.id} asset={asset} />
        ))}
        {!props.assets.length ? (
          <p className="text-sm text-muted-foreground">
            Esta aula ainda não tem materiais anexados.
          </p>
        ) : null}
      </div>
      <TutorPanel
        context={{
          courseId: String(props.tutorContext.courseId),
          courseTitle: props.tutorContext.courseTitle,
          lessonId: String(props.tutorContext.lessonId),
          lessonTitle: props.tutorContext.lessonTitle,
          language: 'pt-BR',
        }}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => void complete()} disabled={busy || done}>
          {done ? 'Aula concluída' : busy ? 'Salvando…' : 'Marcar como concluída'}
        </Button>
        {props.prev ? (
          <Button asChild variant="outline">
            <Link href={`/aluno/cursos/${props.courseSlug}/aula/${props.prev.slug}`}>Anterior</Link>
          </Button>
        ) : null}
        {props.next ? (
          <Button asChild variant="outline">
            <Link href={`/aluno/cursos/${props.courseSlug}/aula/${props.next.slug}`}>Próxima</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function AssetView({ asset }: { asset: Asset }) {
  const url = asset.media?.url;
  const type = asset.assetType || '';
  if (!url) {
    return <p className="text-sm text-muted-foreground">{asset.title || 'Material sem arquivo'}</p>;
  }
  if (type === 'video' || asset.media?.mimeType?.startsWith('video/')) {
    return (
      <video className="w-full rounded-md border border-border" controls src={url}>
        <a href={url}>Abrir vídeo</a>
      </video>
    );
  }
  if (type === 'pdf' || asset.media?.mimeType === 'application/pdf') {
    return (
      <div className="space-y-2">
        <iframe
          title={asset.title || 'PDF'}
          className="h-[32rem] w-full rounded-md border border-border"
          src={url}
        />
        <a className="text-sm underline" href={url} target="_blank" rel="noreferrer">
          Baixar PDF
        </a>
      </div>
    );
  }
  return (
    <a className="text-sm underline" href={url} target="_blank" rel="noreferrer">
      {asset.title || asset.media?.filename || 'Baixar material'}
    </a>
  );
}
