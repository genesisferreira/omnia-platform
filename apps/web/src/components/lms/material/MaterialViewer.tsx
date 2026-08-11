'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from '@omnia/ui';

import { useLearningEngine } from '@/components/lms/LearningEngineProvider';
import { MaterialAccessBlocked } from '@/components/lms/material/MaterialAccessBlocked';
import { useMaterialProvider } from '@/components/lms/material/MaterialProvider';
import { MaterialMetadataPanel } from '@/components/lms/material/MaterialMetadata';
import { MaterialSkeleton } from '@/components/lms/material/MaterialSkeleton';
import { getLazyRenderer } from '@/components/lms/material/renderers/registry';
import { sanitizeLmsHtml } from '@/lib/lms/sanitize';
import type { MaterialDescriptor, ResolvedMaterial } from '@/lib/lms/material';

export type MaterialViewerProps = {
  descriptor: MaterialDescriptor;
  /** Emite eventos Learning Engine para este material. */
  trackLifecycle?: boolean;
};

type AuthGate =
  | { status: 'pending' }
  | { status: 'granted'; reason: string }
  | { status: 'denied'; reason: string }
  | { status: 'error'; reason: string };

function StateBanner(props: { resolved: ResolvedMaterial }) {
  const s = props.resolved.state;
  if (s === 'ready' || s === 'skeleton' || s === 'loading') return null;
  const titles: Record<string, string> = {
    error: 'Erro ao carregar material',
    offline: 'Você está offline',
    forbidden: 'Sem permissão',
    blocked: 'Material bloqueado',
    unavailable: 'Material indisponível',
    empty: 'Conteúdo vazio',
  };
  return (
    <Alert
      variant={
        s === 'offline' ? 'warning' : s === 'error' || s === 'forbidden' ? 'destructive' : 'default'
      }
      title={titles[s] || s}
    >
      {props.resolved.fallbackMessage || props.resolved.metadata.statusLabel}
    </Alert>
  );
}

function MaterialViewerInner(props: MaterialViewerProps) {
  const engine = useLearningEngine();
  const { resolve, security } = useMaterialProvider();
  const [offline, setOffline] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [authGate, setAuthGate] = useState<AuthGate>({ status: 'pending' });
  const [authNonce, setAuthNonce] = useState(0);
  const lifecycle = useRef(false);

  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  const resolved = useMemo(
    () => resolve(props.descriptor, { offline }),
    [resolve, props.descriptor, offline],
  );

  const assetId =
    props.descriptor.source.assetId?.trim() ||
    `omnia-material:${props.descriptor.courseId}:${props.descriptor.activityId}:${props.descriptor.id}`;

  const runAuthorize = useCallback(async () => {
    setAuthGate({ status: 'pending' });
    const result = await security.mediaAuthorization.authorize({
      assetId,
      courseId: props.descriptor.courseId,
      activityId: props.descriptor.activityId,
      materialId: props.descriptor.id,
      purpose: 'view',
    });
    if (!result.ok) {
      setAuthGate({
        status: result.code === 'DENIED' ? 'denied' : 'error',
        reason: result.reason,
      });
      return;
    }
    const viewer = await security.protectedViewer.open({
      assetId,
      grantId: result.grantId,
      decisionGranted: true,
    });
    if (!viewer.ok) {
      setAuthGate({ status: 'denied', reason: viewer.reason });
      return;
    }
    // Signed access contrato (mock) — não altera entrega do conteúdo neste épico
    if (result.grantToken) {
      void security.signedUrl.issue({
        assetId,
        grantId: result.grantId,
        decisionId: result.decisionId,
        grantToken: result.grantToken,
      });
    }
    setAuthGate({ status: 'granted', reason: result.reason });
  }, [assetId, props.descriptor, security]);

  useEffect(() => {
    void runAuthorize();
  }, [runAuthorize, authNonce]);

  useEffect(() => {
    if (props.trackLifecycle === false) return;
    if (lifecycle.current) return;
    if (authGate.status !== 'granted') return;
    lifecycle.current = true;
    const { courseId, activityId, id } = props.descriptor;
    engine.openMaterial(courseId, activityId, id);
    engine.viewMaterial(courseId, activityId, id);
    return () => {
      engine.closeMaterial(courseId, activityId, id);
      lifecycle.current = false;
    };
  }, [engine, props.descriptor, props.trackLifecycle, authGate.status]);

  const Renderer = useMemo(() => getLazyRenderer(resolved.rendererKey), [resolved.rendererKey]);

  const body =
    resolved.type === 'html' && resolved.source.body
      ? sanitizeLmsHtml(resolved.source.body)
      : resolved.source.body;

  const showContent =
    authGate.status === 'granted' &&
    (resolved.state === 'ready' ||
      resolved.state === 'offline' ||
      (resolved.state === 'empty' && Boolean(resolved.fallbackMessage)));

  function handleComplete() {
    if (completed || !resolved.permissions.canComplete) return;
    engine.completeMaterial(
      props.descriptor.courseId,
      props.descriptor.activityId,
      props.descriptor.id,
    );
    setCompleted(true);
  }

  return (
    <Card
      className="shadow-lms-card animate-lms-fade-in"
      aria-label={`Material: ${resolved.metadata.name}`}
    >
      <CardHeader className="space-y-3">
        <CardTitle className="text-base">{resolved.metadata.name}</CardTitle>
        <MaterialMetadataPanel metadata={resolved.metadata} />
      </CardHeader>
      <CardContent className="space-y-4">
        {authGate.status === 'pending' ? <MaterialSkeleton /> : null}
        {authGate.status === 'denied' || authGate.status === 'error' ? (
          <MaterialAccessBlocked
            reason={authGate.reason}
            materialName={resolved.metadata.name}
            onRetry={() => setAuthNonce((n) => n + 1)}
          />
        ) : null}
        {authGate.status === 'granted' ? <StateBanner resolved={resolved} /> : null}
        {showContent &&
        resolved.state !== 'forbidden' &&
        resolved.state !== 'blocked' &&
        resolved.state !== 'unavailable' ? (
          <div className="text-sm text-muted-foreground">
            <Renderer
              name={resolved.metadata.name}
              body={body}
              externalUrl={resolved.source.externalUrl}
              previewUrl={resolved.source.previewUrl}
              fallbackMessage={resolved.fallbackMessage}
            />
          </div>
        ) : null}
        {authGate.status === 'granted' && resolved.permissions.canComplete ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={completed ? 'secondary' : 'outline'}
              onClick={handleComplete}
              disabled={completed}
              aria-pressed={completed}
            >
              {completed ? 'Material concluído' : 'Marcar material como concluído'}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export const MaterialViewer = memo(MaterialViewerInner);
