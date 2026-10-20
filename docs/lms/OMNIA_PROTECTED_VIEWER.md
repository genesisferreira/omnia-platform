# Omnia Protected Viewer

Fluxo Material Experience:

1. Resolver material
2. `mediaAuthorization.authorize` (servidor)
3. `protectedViewer.open`
4. Se grant → renderer atual (entrega inalterada)
5. Se deny → `MaterialAccessBlocked`

Componente: `apps/web/src/components/lms/material/MaterialAccessBlocked.tsx`.

Watermark visual e DRM **fora** deste épico.
