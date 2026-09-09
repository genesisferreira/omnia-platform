'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@omnia/ui';

import { TutorPanel } from '@/components/ai/TutorPanel';
import { resolveExternalVideoUrl } from '@/lib/lms/external-video';

type Asset = {
  id: number;
  title?: string | null;
  assetType?: string | null;
  media?: { url?: string | null; mimeType?: string | null; filename?: string | null } | null;
};

function serializeContent(content: unknown): string | null {
  if (content == null) return null;
  if (typeof content === 'string') return content.trim() ? content : null;
  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return null;
  }
}

export function LessonPlayer(props: {
  courseSlug: string;
  lesson: {
    id: number;
    title: string;
    type?: string | null;
    summary?: string | null;
    content?: unknown;
    externalUrl?: string | null;
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
  const body = serializeContent(props.lesson.content);
  const type = props.lesson.type || 'text';
  const isExternalVideo = type === 'video' || type === 'external_link';
  const video = isExternalVideo ? resolveExternalVideoUrl(props.lesson.externalUrl) : null;
  // Não tratar PDF anexo como substituto do vídeo principal
  const showEmptyMaterials =
    !props.assets.length && !body && !(video && (video.ok || video.reason !== 'missing'));

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

      {video ? <ExternalVideoBlock resolved={video} /> : null}

      {body ? (
        <div className="prose prose-sm max-w-none whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-4 text-foreground">
          {body}
        </div>
      ) : null}

      <div className="space-y-4">
        {props.assets.map((asset) => (
          <AssetView key={asset.id} asset={asset} />
        ))}
        {showEmptyMaterials ? (
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

function ExternalVideoBlock({
  resolved,
}: {
  resolved: ReturnType<typeof resolveExternalVideoUrl>;
}) {
  if (!resolved.ok) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm">
        <p className="font-medium text-foreground">{resolved.message}</p>
        {resolved.watchUrl ? (
          <a
            className="mt-2 inline-block underline"
            href={resolved.watchUrl}
            target="_blank"
            rel="noreferrer"
          >
            Abrir link autorizado
          </a>
        ) : null}
      </div>
    );
  }
  if (resolved.kind === 'direct') {
    return (
      <video className="w-full rounded-md border border-border" controls src={resolved.embedUrl}>
        <a href={resolved.watchUrl}>Abrir vídeo</a>
      </video>
    );
  }
  return (
    <div className="space-y-2">
      <iframe
        title="Vídeo da aula"
        className="aspect-video w-full rounded-md border border-border bg-black"
        src={resolved.embedUrl}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <a className="text-sm underline" href={resolved.watchUrl} target="_blank" rel="noreferrer">
        Abrir no provedor
      </a>
    </div>
  );
}

function AssetView({ asset }: { asset: Asset }) {
  const url = asset.media?.url;
  const type = asset.assetType || '';
  const [mediaError, setMediaError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(url, { method: 'GET', credentials: 'include' });
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (!res.ok || ct.includes('application/json')) {
          const text = await res.text();
          if (text.includes('Something went wrong') || text.includes('"errors"')) {
            if (!cancelled) {
              setMediaError('Material temporariamente indisponível. Tente baixar ou volte mais tarde.');
            }
            return;
          }
          if (!res.ok && !cancelled) setMediaError('Não foi possível carregar este material.');
        }
      } catch {
        if (!cancelled) setMediaError('Não foi possível carregar este material.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url) {
    return <p className="text-sm text-muted-foreground">{asset.title || 'Material sem arquivo'}</p>;
  }
  if (mediaError) {
    return (
      <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
        <p className="font-medium">{asset.title || 'Material'}</p>
        <p className="mt-1 text-muted-foreground">{mediaError}</p>
        <a className="mt-2 inline-block underline" href={url} target="_blank" rel="noreferrer">
          Tentar abrir / baixar
        </a>
      </div>
    );
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
