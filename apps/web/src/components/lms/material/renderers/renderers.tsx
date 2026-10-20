'use client';

export type MaterialRendererProps = {
  name: string;
  body?: string | null;
  externalUrl?: string | null;
  fallbackMessage?: string | null;
  previewUrl?: string | null;
};

function Placeholder(props: { title: string; message?: string | null }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/40 p-4" role="note">
      <p className="font-medium text-foreground">{props.title}</p>
      {props.message ? <p className="mt-1 text-sm text-muted-foreground">{props.message}</p> : null}
    </div>
  );
}

export function TextRenderer(props: MaterialRendererProps) {
  return (
    <div className="prose prose-sm max-w-none text-foreground">
      <p>{props.body || props.fallbackMessage || 'Sem texto.'}</p>
    </div>
  );
}

export function HtmlRenderer(props: MaterialRendererProps) {
  if (!props.body?.trim()) {
    return <Placeholder title="HTML" message={props.fallbackMessage} />;
  }
  return (
    <div
      className="prose prose-sm max-w-none text-foreground"
      dangerouslySetInnerHTML={{ __html: props.body }}
    />
  );
}

export function ImageRenderer(props: MaterialRendererProps) {
  const src = props.previewUrl || props.externalUrl;
  if (!src) {
    return <Placeholder title="Imagem" message={props.fallbackMessage || 'Imagem indisponível.'} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- asset futuro via signed URL
    <img
      src={src}
      alt={props.name}
      className="max-h-[28rem] w-auto max-w-full rounded-md border border-border"
    />
  );
}

export function PdfRenderer(props: MaterialRendererProps) {
  const src = props.previewUrl || props.externalUrl;
  if (!src) {
    return (
      <Placeholder
        title="PDF"
        message={props.fallbackMessage || 'Arquivo PDF ainda não disponível.'}
      />
    );
  }
  return (
    <div className="space-y-2">
      <iframe
        title={props.name}
        className="h-[28rem] w-full rounded-md border border-border"
        src={src}
      />
      <a className="text-sm underline" href={src} target="_blank" rel="noreferrer">
        Abrir / baixar PDF
      </a>
    </div>
  );
}

export function VideoRenderer(props: MaterialRendererProps) {
  const src = props.previewUrl || props.externalUrl;
  if (!src) {
    return (
      <Placeholder title="Vídeo" message={props.fallbackMessage || 'Vídeo ainda não disponível.'} />
    );
  }
  return (
    <video className="w-full rounded-md border border-border" controls src={src}>
      <a href={src}>Abrir vídeo</a>
    </video>
  );
}

export function ExternalLinkRenderer(props: MaterialRendererProps) {
  if (!props.externalUrl) {
    return (
      <Placeholder title="Link externo" message={props.fallbackMessage || 'Link indisponível.'} />
    );
  }
  return (
    <p>
      <a
        href={props.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Abrir link externo
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
    </p>
  );
}

export function FileRenderer(props: MaterialRendererProps) {
  return (
    <Placeholder
      title="Arquivo (placeholder)"
      message={props.fallbackMessage || 'Download direto desabilitado por política Omnia.'}
    />
  );
}

export function H5pRenderer(props: MaterialRendererProps) {
  return (
    <Placeholder
      title="H5P (placeholder)"
      message={props.fallbackMessage || 'Renderer H5P Omnia em evolução.'}
    />
  );
}

export function UnknownRenderer(props: MaterialRendererProps) {
  return (
    <Placeholder
      title="Tipo não suportado"
      message={props.fallbackMessage || `Não há renderer para este material (${props.name}).`}
    />
  );
}
