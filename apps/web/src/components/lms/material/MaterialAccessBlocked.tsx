'use client';

import { Alert, Button } from '@omnia/ui';

export type MaterialAccessBlockedProps = {
  reason: string;
  materialName?: string;
  onRetry?: () => void;
};

/**
 * Tela oficial de bloqueio — Media Authorization negou acesso.
 */
export function MaterialAccessBlocked(props: MaterialAccessBlockedProps) {
  return (
    <div
      className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-6"
      role="alert"
      aria-live="assertive"
    >
      <Alert variant="destructive" title="Acesso ao material bloqueado">
        {props.materialName
          ? `O material “${props.materialName}” não pode ser exibido.`
          : 'Este material não pode ser exibido.'}{' '}
        Motivo: {props.reason}
      </Alert>
      <p className="text-sm text-muted-foreground">
        A autorização de mídia é decidida no servidor (Omnia Media Authorization). Downloads,
        impressão e compartilhamento seguem a política corporativa.
      </p>
      {props.onRetry ? (
        <Button type="button" size="sm" variant="outline" onClick={props.onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
