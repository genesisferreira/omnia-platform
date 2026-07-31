'use client';

import type { MaterialMetadata } from '@/lib/lms/material';

function formatSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MaterialMetadataPanel(props: { metadata: MaterialMetadata }) {
  const m = props.metadata;
  return (
    <dl
      className="grid gap-2 rounded-md border border-border bg-card p-3 text-sm sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Metadados do material"
    >
      <div>
        <dt className="text-xs text-muted-foreground">Nome</dt>
        <dd className="font-medium text-foreground">{m.name}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Tipo</dt>
        <dd className="font-medium text-foreground">{m.type}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Status</dt>
        <dd className="font-medium text-foreground">{m.statusLabel}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Tempo estimado</dt>
        <dd className="font-medium text-foreground">
          {m.estimatedMinutes != null ? `${m.estimatedMinutes} min` : '—'}
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs text-muted-foreground">Descrição</dt>
        <dd className="text-muted-foreground">{m.description || '—'}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Tamanho</dt>
        <dd className="font-medium text-foreground">{formatSize(m.sizeBytes)}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Último acesso</dt>
        <dd className="font-medium text-foreground">
          {m.lastAccessedAt
            ? new Date(m.lastAccessedAt).toLocaleString('pt-BR')
            : 'Nesta sessão'}
        </dd>
      </div>
    </dl>
  );
}
